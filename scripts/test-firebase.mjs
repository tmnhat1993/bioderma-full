import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const required = ['NEXT_PUBLIC_FIREBASE_API_KEY','FIREBASE_PROJECT_ID','FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);

const app = initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
}) });

const db = getFirestore(app);
const healthRef = db.collection('_healthChecks').doc('codex-local-config');
await healthRef.set({ source: 'local-config-test', checkedAt: new Date().toISOString() });
const health = await healthRef.get();
if (!health.exists) throw new Error('Firestore health-check document was not readable.');
await healthRef.delete();
console.log('Firestore Admin read/write: OK');

await getAuth(app).listUsers(1);
console.log('Firebase Authentication Admin API: OK');

const configuredAdminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);
let configuredAdminCount = 0;
for (const email of configuredAdminEmails) {
  try {
    await getAuth(app).getUserByEmail(email);
    configuredAdminCount += 1;
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }
}
console.log(`Configured CMS admin accounts found: ${configuredAdminCount}/${configuredAdminEmails.length}`);

const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)}`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'codex-healthcheck@example.invalid', password: 'not-a-real-password', returnSecureToken: false }),
});
const authBody = await authResponse.json();
const authCode = authBody?.error?.message || '';
if (!['INVALID_LOGIN_CREDENTIALS','EMAIL_NOT_FOUND','INVALID_PASSWORD'].includes(authCode)) {
  throw new Error(`Firebase Web Auth test failed: ${authCode || authResponse.status}`);
}
console.log('Firebase Web API key + Email/Password provider: OK');

await deleteApp(app);
