import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { useTheme } from '../theme';
import { Header, IconBtn, Avatar, Btn } from '../components/ui';
import { money, fdate, balanceOf, balLabel, balColorKey, cmpDesc } from '../utils';

export default function HomeScreen({ db, tab, setTab, q, setQ, onOpen, onAdd, onSample, onRename }) {
  const c = useTheme();

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return db.parties
      .filter((p) => p.type === tab && (!needle || p.name.toLowerCase().includes(needle) || (p.phone || '').includes(needle)))
      .map((p) => {
        const last = db.txns.filter((t) => t.pid === p.id).sort(cmpDesc)[0];
        return { p, bal: balanceOf(db.txns, p.id), last };
      })
      .sort((a, b) => a.p.name.localeCompare(b.p.name, undefined, { sensitivity: 'base' }));
  }, [db, tab, q]);

  const totals = useMemo(() => {
    const byType = { customer: { get: 0, give: 0 }, supplier: { get: 0, give: 0 } };
    db.parties.forEach((p) => {
      const b = balanceOf(db.txns, p.id);
      const t = byType[p.type] || byType.customer;
      if (b > 0) t.get += b; else t.give -= b;
    });
    return byType[tab];
  }, [db, tab]);

  const noun = tab === 'customer' ? 'Customer' : 'Supplier';

  const header = (
    <View>
      <Text style={{ color: c.muted, fontWeight: '700', fontSize: 11.5, marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {noun}s \u2014 totals
      </Text>
      <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
        <View style={{ flex: 1, padding: 14 }}>
          <Text style={{ color: c.muted, fontWeight: '600', fontSize: 12.5 }}>You'll get</Text>
          <Text style={{ color: c.green, fontWeight: '800', fontSize: 22 }}>{money(totals.get)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: c.line }} />
        <View style={{ flex: 1, padding: 14 }}>
          <Text style={{ color: c.muted, fontWeight: '600', fontSize: 12.5 }}>You'll give</Text>
          <Text style={{ color: c.red, fontWeight: '800', fontSize: 22 }}>{money(totals.give)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: c.line, padding: 4, borderRadius: 12, marginTop: 16, marginBottom: 10 }}>
        {[['customer', 'Customers'], ['supplier', 'Suppliers']].map(([v, label]) => (
          <Pressable key={v} onPress={() => setTab(v)} accessibilityRole="tab" accessibilityState={{ selected: tab === v }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: tab === v ? c.surface : 'transparent' }}>
            <Text style={{ fontWeight: '700', color: tab === v ? c.text : c.muted }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={q} onChangeText={setQ} placeholder="Search by name or phone" placeholderTextColor={c.muted}
        style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, color: c.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, marginBottom: 10 }} />
    </View>
  );

  const empty = (
    <View style={{ alignItems: 'center', padding: 34 }}>
      <Text style={{ color: c.text, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
        {q ? 'No matches' : `No ${tab === 'customer' ? 'customers' : 'suppliers'} yet`}
      </Text>
      <Text style={{ color: c.muted, textAlign: 'center' }}>
        {q ? 'Try a different name or number.' : 'Add one to start recording what you gave and got.'}
      </Text>
      {!q && db.parties.length === 0 ? <Btn kind="ghost" label="Load sample data" onPress={onSample} style={{ marginTop: 14 }} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Header title={db.business} subtitle="Tap to switch business" right={<IconBtn label={'\u21C4'} a11y="Switch business" onPress={onRename} />} />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.p.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item.p.id)} android_ripple={{ color: c.line }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, marginBottom: 8 }}>
            <Avatar name={item.p.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{item.p.name}</Text>
              <Text style={{ color: c.muted, fontSize: 12.5 }}>{item.last ? 'Last entry ' + fdate(item.last.date) : 'No entries yet'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: c[balColorKey(item.bal)], fontWeight: '800', fontSize: 16 }}>{money(item.bal)}</Text>
              <Text style={{ color: c.muted, fontSize: 11.5 }}>{balLabel(item.bal)}</Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable onPress={onAdd} accessibilityRole="button"
        style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: c.brand, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, elevation: 6 }}>
        <Text style={{ color: c.brandInk, fontWeight: '800' }}>+ Add {noun}</Text>
      </Pressable>
    </View>
  );
}
