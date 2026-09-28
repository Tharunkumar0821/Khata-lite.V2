import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { useTheme } from '../theme';
import { Header } from '../components/ui';
import { money, fdate, todayStr, daysAgoStr, cmpDesc } from '../utils';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];
const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'gave', label: 'You gave' },
  { value: 'got', label: 'You got' },
];

export default function CashbookScreen({ db, onOpen }) {
  const c = useTheme();
  const [period, setPeriod] = useState('all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');

  const snapshot = useMemo(() => {
    const t = todayStr();
    const mo = t.slice(0, 7);
    const s = { gotToday: 0, gaveToday: 0, net: 0 };
    db.txns.forEach((x) => {
      const sign = x.type === 'got' ? 1 : -1;
      if (x.date === t) { if (x.type === 'got') s.gotToday += x.amount; else s.gaveToday += x.amount; }
      if (x.date.slice(0, 7) === mo) s.net += sign * x.amount;
    });
    return s;
  }, [db]);

  const { items, filteredCount, filteredGot, filteredGave } = useMemo(() => {
    const t = todayStr();
    const weekStart = daysAgoStr(6);
    const mo = t.slice(0, 7);
    const needle = q.trim().toLowerCase();

    const inPeriod = (x) => {
      if (period === 'today') return x.date === t;
      if (period === 'week') return x.date >= weekStart;
      if (period === 'month') return x.date.slice(0, 7) === mo;
      return true;
    };

    const pById = Object.fromEntries(db.parties.map((p) => [p.id, p]));
    let got = 0, gave = 0, count = 0;
    const out = [];
    let last = '';
    db.txns
      .filter((x) => pById[x.pid])
      .filter(inPeriod)
      .filter((x) => type === 'all' || x.type === type)
      .filter((x) => {
        if (!needle) return true;
        const p = pById[x.pid];
        return p.name.toLowerCase().includes(needle) || (x.note || '').toLowerCase().includes(needle) || (x.billNo || '').toLowerCase().includes(needle);
      })
      .sort(cmpDesc)
      .forEach((x) => {
        count += 1;
        if (x.type === 'got') got += x.amount; else gave += x.amount;
        if (x.date !== last) { out.push({ kind: 'day', key: 'd' + x.date, date: x.date }); last = x.date; }
        out.push({ kind: 'tx', key: x.id, x, p: pById[x.pid] });
      });
    return { items: out, filteredCount: count, filteredGot: got, filteredGave: gave };
  }, [db, period, type, q]);

  const Stat = ({ label, value, color }) => (
    <View style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 11 }}>
      <Text style={{ color: c.muted, fontWeight: '600', fontSize: 11.5 }}>{label}</Text>
      <Text style={{ color, fontWeight: '800', fontSize: 16 }}>{value}</Text>
    </View>
  );

  const Segmented = ({ options, value, onChange }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brand : c.surface }}>
            <Text style={{ fontWeight: '700', fontSize: 12.5, color: on ? c.brandInk : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const filtersActive = period !== 'all' || type !== 'all' || q.trim();
  const net = filteredGot - filteredGave;

  const top = (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <Stat label="Got today" value={money(snapshot.gotToday)} color={c.green} />
        <Stat label="Gave today" value={money(snapshot.gaveToday)} color={c.red} />
        <Stat label="Net this month" value={money(snapshot.net)} color={snapshot.net >= 0 ? c.green : c.red} />
      </View>

      <TextInput value={q} onChangeText={setQ} placeholder="Search by party, note or bill no." placeholderTextColor={c.muted}
        style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, marginBottom: 10 }} />

      <Segmented options={PERIODS} value={period} onChange={setPeriod} />
      <View style={{ height: 8 }} />
      <Segmented options={TYPES} value={type} onChange={setType} />

      {filtersActive ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
          <Text style={{ color: c.muted, fontSize: 12.5, fontWeight: '600' }}>{filteredCount} {filteredCount === 1 ? 'entry' : 'entries'}</Text>
          <Text style={{ color: net >= 0 ? c.green : c.red, fontWeight: '800', fontSize: 13.5 }}>Net {money(net)}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Header title="Cashbook" subtitle="All entries, newest first" />
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={top}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 30 }}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
              {filtersActive ? 'No matching entries' : 'Nothing recorded'}
            </Text>
            <Text style={{ color: c.muted, textAlign: 'center' }}>
              {filtersActive ? 'Try a different search term or filter.' : 'Entries you add for customers and suppliers show up here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'day' ? (
            <Text style={{ color: c.muted, fontWeight: '700', fontSize: 12.5, marginTop: 14, marginBottom: 6, marginLeft: 2 }}>{fdate(item.date)}</Text>
          ) : (
            <Pressable onPress={() => onOpen(item.p.id)} android_ripple={{ color: c.line }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12, marginBottom: 6 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: c.text, fontWeight: '700' }}>{item.p.name}</Text>
                <Text numberOfLines={1} style={{ color: c.muted, fontSize: 12.5 }}>
                  {item.x.note || (item.x.type === 'gave' ? 'You gave' : 'You got')}
                  {item.x.billNo ? `  \u2022  Bill #${item.x.billNo}` : ''}
                </Text>
              </View>
              <View style={{ backgroundColor: item.x.type === 'gave' ? c.redBg : c.greenBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 }}>
                <Text style={{ color: item.x.type === 'gave' ? c.red : c.green, fontWeight: '800' }}>
                  {item.x.type === 'gave' ? '\u2212 ' : '+ '}{money(item.x.amount)}
                </Text>
              </View>
            </Pressable>
          )
        }
      />
    </View>
  );
}
