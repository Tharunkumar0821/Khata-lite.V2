import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Linking, Share, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme';
import { IconBtn, toast } from '../components/ui';
import { billUri, sendToWhatsApp } from '../bills';
import { money, fdate, dateStr, balanceOf, cmpAsc, cmpDesc } from '../utils';

const TYPE_OPTIONS = [
  { value: 'all', label: 'ALL' },
  { value: 'gave', label: 'YOU GAVE' },
  { value: 'got', label: 'YOU GOT' },
];

export default function LedgerScreen({ db, party, onBack, onEditParty, onEntry, onEditEntry, onViewBill }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const bal = balanceOf(db.txns, party.id);

  const [startDate, setStartDate] = useState(''); // '' = no lower bound
  const [endDate, setEndDate] = useState('');
  const [showPicker, setShowPicker] = useState(null); // 'start' | 'end' | null
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  // Running balance is computed over the FULL history so it stays
  // accurate even while the visible list is filtered/searched.
  const runningById = useMemo(() => {
    const asc = db.txns.filter((t) => t.pid === party.id).sort(cmpAsc);
    let run = 0;
    const m = {};
    asc.forEach((t) => { run += t.type === 'gave' ? t.amount : -t.amount; m[t.id] = Math.round(run * 100) / 100; });
    return m;
  }, [db.txns, party.id]);

  const { rows, totalGave, totalGot, count } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let gave = 0, got = 0, n = 0;
    const out = db.txns
      .filter((t) => t.pid === party.id)
      .filter((t) => !startDate || t.date >= startDate)
      .filter((t) => !endDate || t.date <= endDate)
      .filter((t) => type === 'all' || t.type === type)
      .filter((t) => !needle || (t.note || '').toLowerCase().includes(needle) || (t.billNo || '').toLowerCase().includes(needle) || (t.invoiceNo || '').toLowerCase().includes(needle) || t.date.includes(needle))
      .sort(cmpDesc);
    out.forEach((t) => { n += 1; if (t.type === 'gave') gave += t.amount; else got += t.amount; });
    return { rows: out, totalGave: gave, totalGot: got, count: n };
  }, [db.txns, party.id, startDate, endDate, type, q]);

  const open = (url) => Linking.openURL(url).catch(() => Alert.alert('Could not open link', 'No app on this phone can handle it.'));

  const filteredStatement = () => {
    const lines = [`Statement: ${party.name} (${db.business})`, ''];
    rows.slice().sort(cmpAsc).forEach((t) => {
      lines.push(`${fdate(t.date)}  ${t.type === 'gave' ? 'Gave' : 'Got '}  ${money(t.amount)}${t.note ? '  ' + t.note : ''}`);
    });
    lines.push('', `You gave: ${money(totalGave)}   You got: ${money(totalGot)}`, `Net balance: ${money(totalGave - totalGot)}`);
    return lines.join('\n');
  };

  const doShare = () => {
    const withBills = rows.find((t) => t.bills && t.bills.length);
    sendToWhatsApp({ phone: party.phone, message: filteredStatement(), billNames: withBills ? withBills.bills : [] });
  };
  const doDownload = () => Share.share({ message: filteredStatement() }).catch(() => toast('Could not share'));

  const pickDate = (which) => {
    const current = which === 'start' ? startDate : endDate;
    setShowPicker({ which, value: current ? new Date(current + 'T00:00:00') : new Date() });
  };
  const onPickerChange = (event, selected) => {
    const which = showPicker && showPicker.which;
    setShowPicker(null);
    if (event.type !== 'set' || !selected || !which) return;
    const s = dateStr(selected);
    if (which === 'start') setStartDate(s); else setEndDate(s);
  };

  const DateBtn = ({ label, value, onPress, onClear }) => (
    <Pressable onPress={onPress} style={{ flex: 1, backgroundColor: c.surface, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 15 }}>{'\uD83D\uDCC5'}</Text>
      <Text numberOfLines={1} style={{ color: c.brand, fontWeight: '800', fontSize: 12.5, flex: 1 }}>{value ? fdate(value) : label}</Text>
      {value ? (
        <Pressable onPress={onClear} hitSlop={8}><Text style={{ color: c.muted, fontSize: 15 }}>{'\u2715'}</Text></Pressable>
      ) : null}
    </Pressable>
  );

  const netColor = totalGave >= totalGot ? c.red : c.green;
  const selectedTypeLabel = TYPE_OPTIONS.find((o) => o.value === type).label;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.brand, paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <IconBtn label={'\u2190'} a11y="Back" onPress={onBack} />
          <Text numberOfLines={1} style={{ color: c.brandInk, fontSize: 17, fontWeight: '800', flex: 1 }}>Report of {party.name}</Text>
          <IconBtn label={'\u270E'} a11y="Edit party" onPress={onEditParty} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <DateBtn label="START DATE" value={startDate} onPress={() => pickDate('start')} onClear={() => setStartDate('')} />
          <DateBtn label="END DATE" value={endDate} onPress={() => pickDate('end')} onClear={() => setEndDate('')} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>{'\uD83D\uDD0D'}</Text>
            <TextInput value={q} onChangeText={setQ} placeholder="Search Entries" placeholderTextColor={c.muted}
              style={{ flex: 1, color: c.text, paddingVertical: 11, fontSize: 14 }} />
          </View>
          <Pressable onPress={() => setTypeMenuOpen(true)} style={{ backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: c.brand, fontWeight: '800', fontSize: 12.5 }}>{selectedTypeLabel}</Text>
            <Text style={{ color: c.brand, fontSize: 11 }}>{'\u25BE'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ backgroundColor: c.surface, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>Net Balance</Text>
          <Text style={{ color: netColor, fontSize: 20, fontWeight: '800' }}>{money(totalGave - totalGot)}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700' }}>TOTAL</Text>
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 14.5 }}>{count} {count === 1 ? 'Entry' : 'Entries'}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700' }}>YOU GAVE</Text>
            <Text style={{ color: c.red, fontWeight: '800', fontSize: 14.5 }}>{money(totalGave)}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700' }}>YOU GOT</Text>
            <Text style={{ color: c.green, fontWeight: '800', fontSize: 14.5 }}>{money(totalGot)}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 12 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 34 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: 6 }}>No entries found</Text>
            <Text style={{ color: c.muted, textAlign: 'center' }}>Try clearing the date range, search, or filter.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onEditEntry(item.id)} android_ripple={{ color: c.line }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <View style={{ flex: 1.1, minWidth: 0 }}>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{fdate(item.date)}</Text>
              <Text style={{ color: c.muted, fontSize: 12 }}>Bal. {money(runningById[item.id] ?? 0)}</Text>
              {item.note ? <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12 }}>{item.note}</Text> : null}
              {item.billNo || item.invoiceNo ? (
                <Text numberOfLines={1} style={{ color: c.muted, fontSize: 11.5 }}>
                  {item.billNo ? `Bill #${item.billNo}` : ''}{item.billNo && item.invoiceNo ? '  \u2022  ' : ''}{item.invoiceNo ? `Inv #${item.invoiceNo}` : ''}
                </Text>
              ) : null}
              {item.bills && item.bills.length ? (
                <Pressable onPress={() => onViewBill(item)}><Text style={{ color: c.brand, fontSize: 11.5, fontWeight: '700', marginTop: 2 }}>{'\uD83D\uDCF7'} View {item.bills.length > 1 ? `${item.bills.length} bills` : 'bill'}</Text></Pressable>
              ) : null}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {item.type === 'gave' ? <Text style={{ color: c.red, fontWeight: '800', fontSize: 15 }}>{money(item.amount)}</Text> : null}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {item.type === 'got' ? <Text style={{ color: c.green, fontWeight: '800', fontSize: 15 }}>{money(item.amount)}</Text> : null}
            </View>
          </Pressable>
        )}
      />

      <View style={{ flexDirection: 'row', gap: 10, padding: 10, backgroundColor: c.surface }}>
        <Pressable onPress={() => onEntry('gave')} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>{'\u2212'}</Text>
        </Pressable>
        <Pressable onPress={() => onEntry('got')} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>{'+'}</Text>
        </Pressable>
        <Pressable onPress={doDownload} style={{ flex: 1, borderWidth: 1.5, borderColor: c.brand, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
          <Text style={{ fontSize: 14 }}>{'\uD83D\uDCC4'}</Text>
          <Text style={{ color: c.brand, fontWeight: '800' }}>Download</Text>
        </Pressable>
        {party.phone ? (
          <Pressable onPress={() => open('tel:' + party.phone)} style={{ width: 46, height: 46, borderRadius: 10, borderWidth: 1.5, borderColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>{'\uD83D\uDCDE'}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={doShare} style={{ flex: 1, backgroundColor: c.brand, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
          <Text style={{ fontSize: 14 }}>{'\uD83D\uDD17'}</Text>
          <Text style={{ color: c.brandInk, fontWeight: '800' }}>Share</Text>
        </Pressable>
      </View>
      <View style={{ height: insets.bottom, backgroundColor: c.surface }} />

      {showPicker ? (
        <DateTimePicker value={showPicker.value} mode="date" display="default" maximumDate={new Date()} onChange={onPickerChange} />
      ) : null}

      <Modal transparent visible={typeMenuOpen} animationType="fade" onRequestClose={() => setTypeMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,14,24,.4)' }} onPress={() => setTypeMenuOpen(false)}>
          <View style={{ position: 'absolute', top: insets.top + 96, right: 12, backgroundColor: c.surface, borderRadius: 12, overflow: 'hidden', minWidth: 150, elevation: 6 }}>
            {TYPE_OPTIONS.map((o) => (
              <Pressable key={o.value} onPress={() => { setType(o.value); setTypeMenuOpen(false); }}
                style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: o.value === type ? c.bg : c.surface }}>
                <Text style={{ color: o.value === type ? c.brand : c.text, fontWeight: '700', fontSize: 13.5 }}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
