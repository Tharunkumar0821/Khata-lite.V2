import React from 'react';
import { View, Text, Pressable, TextInput, Modal, KeyboardAvoidingView, ScrollView, Platform, Alert, ToastAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { initials } from '../utils';

export function toast(msg) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert(msg);
}

export function Header({ title, subtitle, left, right }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.brand, paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {left}
      <View style={{ flex: 1, minWidth: 0, paddingLeft: left ? 0 : 4 }}>
        <Text numberOfLines={1} style={{ color: c.brandInk, fontSize: 18, fontWeight: '800' }}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={{ color: c.brandInk, opacity: 0.75, fontSize: 12 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function IconBtn({ label, onPress, a11y }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}
      android_ripple={{ color: 'rgba(255,255,255,.25)', borderless: true }}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.brandInk, fontSize: 20 }}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ name, size = 42, onBrand }) {
  const c = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, alignItems: 'center', justifyContent: 'center',
      backgroundColor: onBrand ? 'rgba(255,255,255,.2)' : c.brand }}>
      <Text style={{ color: c.brandInk, fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function Btn({ label, onPress, kind = 'primary', style }) {
  const c = useTheme();
  const map = {
    primary: { bg: c.brand, fg: c.brandInk, border: c.brand },
    ghost: { bg: c.surface, fg: c.text, border: c.line },
    danger: { bg: c.surface, fg: c.red, border: c.line },
    red: { bg: c.red, fg: '#ffffff', border: c.red },
    green: { bg: c.green, fg: '#ffffff', border: c.green },
  }[kind];
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [{ backgroundColor: map.bg, borderColor: map.border, borderWidth: 1, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', opacity: pressed ? 0.85 : 1 }, style]}>
      <Text style={{ color: map.fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, onPress }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...props }) {
  const c = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.muted, marginBottom: 5 }}>{label}</Text>
      <TextInput placeholderTextColor={c.muted} {...props}
        style={[{ borderWidth: 1, borderColor: c.line, backgroundColor: c.bg, color: c.text, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, fontSize: 16 }, style]} />
    </View>
  );
}

export function Seg({ options, value, onChange }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brand : 'transparent' }}>
            <Text style={{ fontWeight: '700', color: on ? c.brandInk : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ErrorText({ children }) {
  const c = useTheme();
  return <Text style={{ color: c.red, fontWeight: '600', fontSize: 13, minHeight: 18, marginBottom: 6 }}>{children || ''}</Text>;
}

export function Sheet({ title, onClose, children }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,14,24,.5)', justifyContent: 'flex-end' }} onPress={onClose}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 18 + insets.bottom, maxHeight: '92%' }}>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>{title}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function BottomNav({ view, onNav, onSettings }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const Item = ({ icon, label, on, onPress }) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1, alignItems: 'center', paddingVertical: 9 }}>
      <Text style={{ fontSize: 19 }}>{icon}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: on ? c.brand : c.muted }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom }}>
      <Item icon={'\uD83D\uDC65'} label="Parties" on={view === 'home'} onPress={() => onNav('home')} />
      <Item icon={'\uD83D\uDCD2'} label="Cashbook" on={view === 'cash'} onPress={() => onNav('cash')} />
      <Item icon={'\u2699\uFE0F'} label="Settings" on={false} onPress={onSettings} />
    </View>
  );
}
