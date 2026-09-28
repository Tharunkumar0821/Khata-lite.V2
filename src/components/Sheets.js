import React, { useRef, useState } from 'react';
import { View, Text, Share, Image, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet, Field, Seg, Btn, ErrorText, Chip, toast } from './ui';
import { useTheme } from '../theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { todayStr, daysAgoStr, dateStr, fdate } from '../utils';
import { billUri, pickBill, deleteBill, sendToWhatsApp } from '../bills';
import { pickContact } from '../contacts';

export function PartySheet({ party, defaultType, onSave, onDelete, onClose }) {
  const [type, setType] = useState(party ? party.type : defaultType);
  const [name, setName] = useState(party ? party.name : '');
  const [phone, setPhone] = useState(party ? party.phone : '');
  const [err, setErr] = useState('');

  const fromContacts = async () => {
    const picked = await pickContact();
    if (!picked) return;
    if (picked.name) setName(picked.name);
    if (picked.phone) setPhone(picked.phone);
    setErr('');
  };

  const save = () => {
    if (!name.trim()) { setErr('Enter a name to save this party.'); return; }
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits && !/^[6-9]\d{9}$/.test(digits)) {
      setErr('Enter a valid 10-digit mobile number, or leave it empty.');
      return;
    }
    onSave({ name: name.trim(), phone: digits, type });
  };
  return (
    <Sheet title={party ? 'Edit party' : `Add ${type === 'customer' ? 'customer' : 'supplier'}`} onClose={onClose}>
      <Seg value={type} onChange={setType} options={[{ value: 'customer', label: 'Customer' }, { value: 'supplier', label: 'Supplier' }]} />
      {!party ? (
        <Btn kind="ghost" label={'\uD83D\uDCD1 Pick from contacts'} onPress={fromContacts} style={{ marginBottom: 12 }} />
      ) : null}
      <Field label="Name" value={name} onChangeText={setName} maxLength={60} autoFocus={!party} autoCapitalize="words" />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={16} />
      <ErrorText>{err}</ErrorText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {party ? <Btn kind="danger" label="Delete" onPress={onDelete} style={{ flex: 1 }} /> : <Btn kind="ghost" label="Cancel" onPress={onClose} style={{ flex: 1 }} />}
        <Btn label="Save" onPress={save} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

export function EntrySheet({ entry, defaultType, partyType, onSave, onDelete, onClose }) {
  const [type, setType] = useState(entry ? entry.type : defaultType);
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [note, setNote] = useState(entry ? entry.note : '');
  const [billNo, setBillNo] = useState(entry ? entry.billNo || '' : '');
  const [invoiceNo, setInvoiceNo] = useState(entry ? entry.invoiceNo || '' : '');
  const [date, setDate] = useState(entry ? entry.date : todayStr());
  const [showPicker, setShowPicker] = useState(false);
  const [bills, setBills] = useState(entry ? entry.bills || [] : []);
  const [err, setErr] = useState('');
  const added = useRef([]); // bill photo files picked during this session, for cleanup on cancel
  const c = useTheme();

  const addPhoto = async (source) => {
    const name = await pickBill(source);
    if (!name) return;
    added.current.push(name);
    setBills((b) => [...b, name]);
  };
  const removePhoto = (name) => {
    if (added.current.includes(name)) { deleteBill(name); added.current = added.current.filter((n) => n !== name); }
    setBills((b) => b.filter((n) => n !== name));
  };
  const cancel = () => {
    // only clean up files added THIS session that are no longer kept
    added.current.filter((n) => !bills.includes(n)).forEach(deleteBill);
    added.current.forEach((n) => { if (!entry || !(entry.bills || []).includes(n)) deleteBill(n); });
    onClose();
  };
  const save = () => {
    const amt = parseFloat(amount.replace(/,/g, ''));
    if (!(amt > 0)) { setErr('Enter an amount greater than 0.'); return; }
    // clean up any picked-then-removed files that never made it into `bills`
    added.current.filter((n) => !bills.includes(n)).forEach(deleteBill);
    // clean up files the original entry had that got removed in this edit
    if (entry) (entry.bills || []).filter((n) => !bills.includes(n)).forEach(deleteBill);
    onSave({
      type, amount: Math.round(amt * 100) / 100, note: note.trim(), date, bills,
      billNo: billNo.trim(), invoiceNo: invoiceNo.trim(),
    });
  };

  return (
    <Sheet title={entry ? 'Edit entry' : type === 'gave' ? 'You gave' : 'You got'} onClose={cancel}>
      <Seg value={type} onChange={setType} options={[{ value: 'gave', label: 'You gave' }, { value: 'got', label: 'You got' }]} />
      <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" autoFocus
        style={{ fontSize: 26, fontWeight: '800' }} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} maxLength={80} placeholder="e.g. Rice 10 kg, advance" />

      {partyType === 'supplier' ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Bill No. (optional)" value={billNo} onChangeText={setBillNo} maxLength={30} autoCapitalize="characters" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Invoice No. (optional)" value={invoiceNo} onChangeText={setInvoiceNo} maxLength={30} autoCapitalize="characters" />
          </View>
        </View>
      ) : null}

      <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.muted, marginBottom: 5 }}>Date</Text>
      <Pressable onPress={() => setShowPicker(true)} accessibilityRole="button"
        style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.bg, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: c.text, fontWeight: '700' }}>{fdate(date)}</Text>
        <Text style={{ color: c.brand, fontWeight: '700' }}>{'\uD83D\uDCC5 Change'}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Chip label="Today" onPress={() => setDate(todayStr())} />
        <Chip label="Yesterday" onPress={() => setDate(daysAgoStr(1))} />
      </View>
      {showPicker ? (
        <DateTimePicker
          value={new Date(date + 'T00:00:00')}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={(event, selected) => { setShowPicker(false); if (event.type === 'set' && selected) setDate(dateStr(selected)); }}
        />
      ) : null}

      <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.muted, marginBottom: 6 }}>
        Bill photos (optional){bills.length ? ` \u2014 ${bills.length}` : ''}
      </Text>
      {bills.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          {bills.map((name) => {
            const uri = billUri(name);
            return (
              <View key={name} style={{ width: 76 }}>
                <Image source={{ uri }} style={{ width: 76, height: 76, borderRadius: 10, backgroundColor: c.line }} />
                <Pressable onPress={() => removePhoto(name)} style={{ marginTop: 4, alignItems: 'center' }}>
                  <Text style={{ color: c.red, fontWeight: '700', fontSize: 11.5 }}>Remove</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <Btn kind="ghost" label={'\uD83D\uDCF7 Take photo'} onPress={() => addPhoto('camera')} style={{ flex: 1 }} />
        <Btn kind="ghost" label={'\uD83D\uDDBC\uFE0F Gallery'} onPress={() => addPhoto('gallery')} style={{ flex: 1 }} />
      </View>

      <ErrorText>{err}</ErrorText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {entry ? <Btn kind="danger" label="Delete" onPress={onDelete} style={{ flex: 1 }} /> : <Btn kind="ghost" label="Cancel" onPress={cancel} style={{ flex: 1 }} />}
        <Btn kind={type === 'gave' ? 'red' : 'green'} label="Save" onPress={save} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

export function BillViewer({ bills, partyName, partyPhone, amountText, onClose }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const list = bills || [];
  const [index, setIndex] = useState(0);
  const uri = billUri(list[index]);
  const send = () => sendToWhatsApp({ phone: partyPhone, message: amountText, billNames: partyPhone ? [list[index]] : list, whatsappOnly: true });
  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ padding: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{partyName}</Text>
          <Text style={{ color: '#cbd2e0', fontSize: 13 }}>{amountText}</Text>
          {list.length > 1 ? <Text style={{ color: '#cbd2e0', fontSize: 12, marginTop: 2 }}>Photo {index + 1} of {list.length}</Text> : null}
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          {list.length > 1 ? (
            <Pressable onPress={() => setIndex((i) => (i - 1 + list.length) % list.length)} style={{ padding: 14 }}>
              <Text style={{ color: '#fff', fontSize: 26 }}>{'\u2039'}</Text>
            </Pressable>
          ) : null}
          <View style={{ flex: 1, height: '100%' }}>
            {uri ? <Image source={{ uri }} resizeMode="contain" style={{ flex: 1 }} /> : (
              <Text style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>Image file not found.</Text>
            )}
          </View>
          {list.length > 1 ? (
            <Pressable onPress={() => setIndex((i) => (i + 1) % list.length)} style={{ padding: 14 }}>
              <Text style={{ color: '#fff', fontSize: 26 }}>{'\u203A'}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: '#cbd2e0', fontSize: 12.5, textAlign: 'center', paddingHorizontal: 16, paddingTop: 10 }}>
          {partyPhone
            ? `Sends this photo straight to ${partyName}'s WhatsApp.`
            : `Tap Send bill, then pick ${partyName || 'the contact'}. Sending picks all photos at once when there\u2019s more than one.`}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, padding: 14 }}>
          <Btn kind="ghost" label="Close" onPress={onClose} style={{ flex: 1 }} />
          <Btn kind="green" label="Send bill" onPress={send} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

export function BusinessSheet({ businesses, activeId, onSwitch, onAdd, onRename, onDelete, onClose }) {
  const c = useTheme();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  return (
    <Sheet title="Businesses" onClose={onClose}>
      {businesses.map((b) => (
        <View key={b.id} style={{ marginBottom: 10 }}>
          {editingId === b.id ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field label="Business name" value={editName} onChangeText={setEditName} autoFocus maxLength={40} />
              </View>
              <Btn label="Save" onPress={() => { if (editName.trim()) onRename(b.id, editName.trim()); setEditingId(null); }} style={{ marginBottom: 12 }} />
            </View>
          ) : (
            <Pressable onPress={() => onSwitch(b.id)} android_ripple={{ color: c.line }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 12, borderWidth: 1,
                borderColor: b.id === activeId ? c.brand : c.line, backgroundColor: c.surface }}>
              <Text numberOfLines={1} style={{ flex: 1, color: c.text, fontWeight: b.id === activeId ? '800' : '600' }}>
                {b.name}{b.id === activeId ? '  \u2713' : ''}
              </Text>
              <Pressable onPress={() => { setEditingId(b.id); setEditName(b.name); }} hitSlop={10} accessibilityLabel={'Rename ' + b.name}>
                <Text style={{ color: c.muted, fontSize: 17 }}>{'\u270E'}</Text>
              </Pressable>
              {businesses.length > 1 ? (
                <Pressable onPress={() => onDelete(b.id, b.name)} hitSlop={10} accessibilityLabel={'Delete ' + b.name}>
                  <Text style={{ color: c.red, fontSize: 17 }}>{'\uD83D\uDDD1'}</Text>
                </Pressable>
              ) : null}
            </Pressable>
          )}
        </View>
      ))}
      {adding ? (
        <View>
          <Field label="Business name" value={newName} onChangeText={setNewName} autoFocus maxLength={40} placeholder="e.g. Shebagam Electricals" />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
            <Btn kind="ghost" label="Cancel" onPress={() => { setAdding(false); setNewName(''); }} style={{ flex: 1 }} />
            <Btn label="Create" onPress={() => { if (newName.trim()) { onAdd(newName.trim()); setAdding(false); setNewName(''); } }} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Btn kind="ghost" label="+ Add business" onPress={() => setAdding(true)} style={{ marginTop: 2, marginBottom: 12 }} />
      )}
      <Btn label="Done" onPress={onClose} />
    </Sheet>
  );
}

export function SettingsSheet({ theme, onTheme, onBusinesses, onSync, onExport, onBackup, onWipe, onClose }) {
  const c = useTheme();
  return (
    <Sheet title="Settings" onClose={onClose}>
      <Text style={{ color: c.muted, fontWeight: '700', fontSize: 12.5, marginBottom: 6 }}>Appearance</Text>
      <Seg value={theme} onChange={onTheme} options={[{ value: '', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      <Btn kind="ghost" label="Businesses" onPress={onBusinesses} style={{ marginBottom: 10 }} />
      <Btn kind="ghost" label="Multi-device sync" onPress={onSync} style={{ marginBottom: 10 }} />
      <Btn kind="ghost" label="Export to Excel" onPress={onExport} style={{ marginBottom: 10 }} />
      <Btn kind="ghost" label="Backup and restore" onPress={onBackup} style={{ marginBottom: 10 }} />
      <Btn kind="danger" label="Erase this business's data" onPress={onWipe} style={{ marginBottom: 10 }} />
      <Btn label="Done" onPress={onClose} />
    </Sheet>
  );
}

export function SyncSheet({ syncCode, onCreate, onJoin, onDisable, onClose }) {
  const c = useTheme();
  const [mode, setMode] = useState('choose'); // 'choose' | 'join'
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) {
      if (e && e.message !== 'cancelled') setErr(e.message || 'Something went wrong.');
    }
    setBusy(false);
  };

  if (syncCode) {
    return (
      <Sheet title="Multi-device sync" onClose={onClose}>
        <Text style={{ color: c.muted, marginBottom: 12 }}>
          This phone is syncing. On your other phone, open Settings, then Multi-device sync, then
          "I have a code from another phone", and enter this code.
        </Text>
        <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: 6, color: c.text }}>{syncCode}</Text>
        </View>
        <ErrorText>{err}</ErrorText>
        <Btn kind="danger" label={busy ? 'Please wait\u2026' : 'Turn off sync on this phone'} onPress={() => run(onDisable)} style={{ marginBottom: 10 }} />
        <Btn kind="ghost" label="Done" onPress={onClose} />
      </Sheet>
    );
  }

  return (
    <Sheet title="Multi-device sync" onClose={onClose}>
      <Text style={{ color: c.muted, marginBottom: 16 }}>
        Keep this business's data the same on two or more phones. Needs an internet connection to stay in sync.
      </Text>
      {mode === 'choose' ? (
        <>
          <Btn label={busy ? 'Please wait\u2026' : 'Turn on sync (this is the first phone)'} onPress={() => run(onCreate)} style={{ marginBottom: 10 }} />
          <Btn kind="ghost" label="I have a code from another phone" onPress={() => { setMode('join'); setErr(''); }} style={{ marginBottom: 10 }} />
        </>
      ) : (
        <>
          <Field label="Sync code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={8} autoFocus placeholder="e.g. 7K3PQR" />
          <ErrorText>{err}</ErrorText>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <Btn kind="ghost" label="Back" onPress={() => { setMode('choose'); setErr(''); }} style={{ flex: 1 }} />
            <Btn label={busy ? 'Joining\u2026' : 'Join'} onPress={() => code.trim() ? run(() => onJoin(code)) : setErr('Enter the code from your other phone.')} style={{ flex: 1 }} />
          </View>
        </>
      )}
      {mode === 'choose' ? <ErrorText>{err}</ErrorText> : null}
      <Btn kind="ghost" label="Cancel" onPress={onClose} />
    </Sheet>
  );
}

export function BackupSheet({ json, onRestore, onClose }) {
  const c = useTheme();
  const [text, setText] = useState(json);
  const [err, setErr] = useState('');
  const restore = () => {
    try { onRestore(JSON.parse(text)); } catch (e) { setErr('That text is not a valid backup.'); }
  };
  return (
    <Sheet title="Backup and restore" onClose={onClose}>
      <Text style={{ color: c.muted, fontSize: 13.5, marginBottom: 10 }}>
        Share this text to save it (WhatsApp, email, Drive). To restore, paste a saved backup into the box and tap Restore.
      </Text>
      <Field label="Backup data" value={text} onChangeText={setText} multiline numberOfLines={6}
        style={{ minHeight: 130, textAlignVertical: 'top', fontFamily: 'monospace', fontSize: 12 }} />
      <ErrorText>{err}</ErrorText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn kind="ghost" label="Share backup" onPress={() => Share.share({ message: text }).catch(() => toast('Could not share'))} style={{ flex: 1 }} />
        <Btn label="Restore" onPress={restore} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}
