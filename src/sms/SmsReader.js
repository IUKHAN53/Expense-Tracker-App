import { PermissionsAndroid, Platform } from 'react-native';

// react-native-get-sms-android is a native module — it only exists in a
// custom dev build (it is not available in Expo Go or on iOS). Loading it
// defensively means the rest of the app still runs everywhere.
let SmsAndroid = null;
try {
  // eslint-disable-next-line global-require
  const mod = require('react-native-get-sms-android');
  SmsAndroid = mod?.default || mod;
} catch {
  SmsAndroid = null;
}

/** Keywords that mark an SMS as likely being a bank/wallet transaction. */
const TXN_PATTERN =
  /(debit|credit|spent|purchase|transaction|withdraw|withdrawn|paid|payment|trx|pos\b|card ending|account|deposit|transfer|rs\.?\s*\d|pkr\s*\d|inr\s*\d)/i;

export function isSmsAvailable() {
  return Platform.OS === 'android' && !!SmsAndroid && typeof SmsAndroid.list === 'function';
}

/** Ask the user for the READ_SMS runtime permission. */
export async function requestSmsPermission() {
  if (Platform.OS !== 'android') return false;

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'Read transaction SMS',
    message:
      'Expense Tracker needs to read your inbox to find bank and wallet transaction messages.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Read inbox SMS received after `sinceTs` (epoch ms) and keep only the ones
 * that look like transactions.
 *
 * @returns {Promise<Array<{sender:string, body:string, received_at:number}>>}
 */
export function readTransactionSms(sinceTs = 0, maxCount = 300) {
  return new Promise((resolve, reject) => {
    if (!isSmsAvailable()) {
      reject(new Error('SMS reading needs the Android dev build of the app.'));
      return;
    }

    const filter = { box: 'inbox', maxCount };
    if (sinceTs > 0) filter.minDate = sinceTs;

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail) => reject(new Error(`Could not read SMS inbox: ${fail}`)),
      (count, smsListJson) => {
        try {
          const list = JSON.parse(smsListJson) || [];
          const transactions = list
            .filter((m) => m?.body && TXN_PATTERN.test(m.body))
            .map((m) => ({
              sender: m.address || null,
              body: m.body,
              received_at: m.date || null,
            }));
          resolve(transactions);
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}
