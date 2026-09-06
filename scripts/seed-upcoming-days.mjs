import { createHash } from 'node:crypto';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);
const seedId = 'dummy-upcoming-20260906';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const atMinute = (date, minute) => new Date(Date.parse(`${date}T02:00:00.000Z`) + minute * 60_000).toISOString();

const profiles = [
  ['[DUMMY] Nguyễn An', 'female', '18-24', true, 0],
  ['[DUMMY] Trần Bình', 'male', '25-45', true, 1],
  ['[DUMMY] Lê Chi', 'female', '25-45', true, 2, 'received'],
  ['[DUMMY] Phạm Dũng', 'male', '45+', true, 3, 'received', 'received'],
  [null, 'female', null, false, 2, 'received'],
  [null, 'male', null, false, 3, 'received', 'received'],
];

const dayConfigs = [
  { date: '2026-09-06', codes: { zone1: '1606', zone2: '2606', zone3: '3606' } },
  { date: '2026-09-07', codes: { zone1: '1707', zone2: '2707', zone3: '3707' } },
  { date: '2026-09-08', codes: { zone1: '1808', zone2: '2808', zone3: '3808' } },
  { date: '2026-09-09', codes: { zone1: '1909', zone2: '2909', zone3: '3909' } },
  { date: '2026-09-10', codes: { zone1: '1710', zone2: '2710', zone3: '3710' } },
].map((day) => ({ ...day, openingStock: 30 }));

for (const day of dayConfigs) {
  const existing = await db.collection('eventDays').doc(day.date).get();
  if (existing.exists && existing.data()?.seedId !== seedId) {
    throw new Error(`Refusing to overwrite existing event day ${day.date}`);
  }
}

for (const collectionName of ['participants', 'inventoryLedger', 'deviceLocks']) {
  const snapshot = await db.collection(collectionName).where('seedId', '==', seedId).get();
  for (let start = 0; start < snapshot.docs.length; start += 400) {
    const batch = db.batch();
    snapshot.docs.slice(start, start + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

let participantCount = 0;
let ledgerCount = 0;
for (const day of dayConfigs) {
  let distributedZone2 = 0;
  let distributedZone3 = 0;
  const batch = db.batch();

  profiles.forEach((profile, index) => {
    const [fullName, gender, ageRange, consent, currentZone, zone2Status, zone3Status] = profile;
    const sequence = index + 1;
    const dayPart = day.date.replaceAll('-', '');
    const participantId = `${seedId}-${dayPart}-${String(sequence).padStart(2, '0')}`;
    const deviceHash = hash(`${participantId}-device`);
    const participant = {
      seedId,
      isDummy: true,
      publicCode: `TEST-${day.date.slice(-2)}${String(sequence).padStart(2, '0')}`,
      eventDate: day.date,
      consent,
      gender,
      createdAt: atMinute(day.date, sequence * 8),
      currentZone,
      deviceHash,
      ...(consent ? { fullName, ageRange } : {}),
      ...(currentZone >= 1 ? { zone1CompletedAt: atMinute(day.date, sequence * 8 + 2) } : {}),
      ...(currentZone >= 2 ? { zone2CompletedAt: atMinute(day.date, sequence * 8 + 4), zone2SampleStatus: zone2Status } : {}),
      ...(currentZone >= 3 ? { zone3CompletedAt: atMinute(day.date, sequence * 8 + 6), zone3SampleStatus: zone3Status } : {}),
    };

    batch.set(db.collection('participants').doc(participantId), participant);
    batch.set(db.collection('deviceLocks').doc(deviceHash), {
      seedId, isDummy: true, participantId, createdAt: participant.createdAt,
    });
    participantCount += 1;

    if (zone2Status === 'received') {
      distributedZone2 += 1;
      batch.set(db.collection('inventoryLedger').doc(`${participantId}-z2`), {
        seedId, isDummy: true, eventDate: day.date, type: 'distribution', quantity: -1,
        zone: 2, participantId, createdAt: participant.zone2CompletedAt,
      });
      ledgerCount += 1;
    }
    if (zone3Status === 'received') {
      distributedZone3 += 1;
      batch.set(db.collection('inventoryLedger').doc(`${participantId}-z3`), {
        seedId, isDummy: true, eventDate: day.date, type: 'distribution', quantity: -1,
        zone: 3, participantId, createdAt: participant.zone3CompletedAt,
      });
      ledgerCount += 1;
    }
  });

  batch.set(db.collection('eventDays').doc(day.date), {
    seedId,
    isDummy: true,
    date: day.date,
    label: `Ngày ${day.date.slice(8, 10)}/${day.date.slice(5, 7)}/${day.date.slice(0, 4)}`,
    openingStock: day.openingStock,
    adjustments: 0,
    distributedZone2,
    distributedZone3,
    remainingStock: day.openingStock - distributedZone2 - distributedZone3,
    codes: day.codes,
    updatedAt: new Date().toISOString(),
    updatedBy: 'codex-upcoming-dummy-seed',
  });

  await batch.commit();
}

console.log(`Seed: ${seedId}`);
console.log(`Event days created: ${dayConfigs.length}`);
console.log(`Dummy participants created: ${participantCount}`);
console.log(`Inventory entries created: ${ledgerCount}`);
for (const day of dayConfigs) console.log(`${day.date}: stock 30, remaining 24, codes ${Object.values(day.codes).join('/')}`);
await deleteApp(app);
