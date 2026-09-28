import { Alert } from 'react-native';
import * as Contacts from 'expo-contacts';

// Opens the phone's own contact picker UI. On Android this is a system
// picker and does not require asking for a runtime "read contacts"
// permission — the user is choosing one contact to hand over, not
// granting the app ongoing access to the whole address book.
// Returns { name, phone } or null if the user cancelled or the
// contact had nothing usable on it.
export async function pickContact() {
  try {
    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return null; // user cancelled

    const name =
      contact.name ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();

    const phones = contact.phoneNumbers || [];
    const phone = phones.length ? String(phones[0].number || '').replace(/\D/g, '') : '';

    if (!name && !phone) {
      Alert.alert('Nothing to import', 'That contact has no name or phone number saved.');
      return null;
    }
    return { name: name || '', phone };
  } catch (e) {
    Alert.alert('Could not open contacts', 'Something went wrong opening your contacts. If this keeps happening, let me know the error.');
    return null;
  }
}
