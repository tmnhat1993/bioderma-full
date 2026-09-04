import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const serviceAccountPath = process.argv[2];
const adminEmail = process.argv[3] || 'admin@bioderma.vn';

if (!serviceAccountPath) {
  throw new Error('Usage: npm run configure:firebase -- <service-account.json> [admin-email]');
}

const serviceAccount = JSON.parse(await readFile(resolve(serviceAccountPath), 'utf8'));
if (serviceAccount.project_id !== 'bioderma-sebium-event' || !serviceAccount.private_key || !serviceAccount.client_email) {
  throw new Error('Service account does not match the Bioderma Firebase project.');
}

const privateKey = serviceAccount.private_key.replace(/\r?\n/g, '\\n');
const env = `# Generated locally. Do not commit this file.\nNEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDt1rCRRz2zRAZvrkVRCNBIw8YdB63mD4M\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bioderma-sebium-event.firebaseapp.com\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=bioderma-sebium-event\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bioderma-sebium-event.firebasestorage.app\nNEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=310132687526\nNEXT_PUBLIC_FIREBASE_APP_ID=1:310132687526:web:873403a48a3a08c02faa67\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n\nFIREBASE_PROJECT_ID=${serviceAccount.project_id}\nFIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}\nFIREBASE_PRIVATE_KEY="${privateKey}"\nADMIN_EMAILS=${adminEmail}\nIP_HASH_SALT=${randomBytes(32).toString('hex')}\nALLOW_EVENT_PREVIEW=true\n`;

await writeFile(resolve('.env.local'), env, { encoding: 'utf8', mode: 0o600 });
console.log('Firebase local environment configured successfully.');
