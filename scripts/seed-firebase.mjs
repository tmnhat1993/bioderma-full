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
const seedId = 'dummy-20260904';
const createdDay = '2026-09-04';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const atMinute = (minute) => new Date(Date.parse(`${createdDay}T02:00:00.000Z`) + minute * 60_000).toISOString();

const profiles = [
  ['Nguyễn Minh Anh', 'female', '18-24', true, 0],
  ['Trần Gia Hân', 'female', '25-45', true, 1],
  ['Lê Hoàng Nam', 'male', '25-45', true, 2, 'received'],
  ['Phạm Thu Trang', 'female', '18-24', true, 3, 'received', 'received'],
  ['Võ Quốc Bảo', 'male', '45+', true, 3, 'received', 'out_of_stock'],
  ['Đặng Ngọc Mai', 'female', '25-45', true, 2, 'out_of_stock'],
  [null, 'male', null, false, 3, 'out_of_stock', 'out_of_stock'],
  [null, 'female', null, false, 1],
  [null, 'male', null, false, 2, 'received'],
  [null, 'female', null, false, 3, 'received', 'received'],
  ['Bùi Đức Long', 'male', '18-24', true, 0],
  ['Đỗ Khánh Linh', 'female', '45+', true, 3, 'received', 'received'],
];

const dayConfigs = [
  {
    date: '2026-09-12', label: 'Ngày 12/09/2026', openingStock: 80, adjustments: 5,
    remainingStock: 76, codes: { zone1: '1842', zone2: '3927', zone3: '6504' }, offset: 0,
    adjustmentsLedger: [[10, 'Nhập bổ sung sample test'], [-5, 'Điều chỉnh kiểm kê test']],
  },
  {
    date: '2026-09-13', label: 'Ngày 13/09/2026', openingStock: 8, adjustments: 1,
    remainingStock: 0, codes: { zone1: '2719', zone2: '4386', zone3: '9052' }, offset: 90,
    adjustmentsLedger: [[1, 'Bổ sung sample cuối ngày test']],
  },
];

async function deletePriorDummyData() {
  for (const collectionName of ['participants', 'inventoryLedger', 'deviceLocks']) {
    const snapshot = await db.collection(collectionName).where('seedId', '==', seedId).get();
    for (let start = 0; start < snapshot.docs.length; start += 400) {
      const batch = db.batch();
      snapshot.docs.slice(start, start + 400).forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }
  }
}

await deletePriorDummyData();

let participantCount = 0;
let ledgerCount = 0;
for (const day of dayConfigs) {
  let distributedZone2 = 0;
  let distributedZone3 = 0;
  const batch = db.batch();

  profiles.forEach((profile, index) => {
    const [fullName, gender, ageRange, consent, currentZone, zone2Status, zone3Status] = profile;
    const sequence = index + 1;
    const participantId = `${seedId}-${day.date.slice(-2)}-${String(sequence).padStart(2, '0')}`;
    const deviceHash = hash(`${participantId}-device`);
    const participant = {
      seedId,
      isDummy: true,
      publicCode: `TEST-${day.date.slice(-2)}${String(sequence).padStart(2, '0')}`,
      eventDate: day.date,
      consent,
      gender,
      createdAt: atMinute(day.offset + sequence),
      currentZone,
      deviceHash,
      ipHash: hash(`${participantId}-ip`),
      ...(consent ? { fullName, ageRange } : {}),
      ...(currentZone >= 1 ? { zone1CompletedAt: atMinute(day.offset + sequence + 1) } : {}),
      ...(currentZone >= 2 ? {
        zone2CompletedAt: atMinute(day.offset + sequence + 2),
        zone2SampleStatus: zone2Status,
      } : {}),
      ...(currentZone >= 3 ? {
        zone3CompletedAt: atMinute(day.offset + sequence + 3),
        zone3SampleStatus: zone3Status,
      } : {}),
    };
    batch.set(db.collection('participants').doc(participantId), participant);
    batch.set(db.collection('deviceLocks').doc(deviceHash), {
      seedId, isDummy: true, participantId, createdAt: participant.createdAt,
    });
    participantCount += 1;

    if (zone2Status === 'received') {
      distributedZone2 += 1;
      const ledgerId = `${participantId}-z2`;
      batch.set(db.collection('inventoryLedger').doc(ledgerId), {
        seedId, isDummy: true, eventDate: day.date, type: 'distribution', quantity: -1,
        zone: 2, participantId, createdAt: participant.zone2CompletedAt,
      });
      ledgerCount += 1;
    }
    if (zone3Status === 'received') {
      distributedZone3 += 1;
      const ledgerId = `${participantId}-z3`;
      batch.set(db.collection('inventoryLedger').doc(ledgerId), {
        seedId, isDummy: true, eventDate: day.date, type: 'distribution', quantity: -1,
        zone: 3, participantId, createdAt: participant.zone3CompletedAt,
      });
      ledgerCount += 1;
    }
  });

  day.adjustmentsLedger.forEach(([quantity, reason], index) => {
    batch.set(db.collection('inventoryLedger').doc(`${seedId}-${day.date.slice(-2)}-adjust-${index + 1}`), {
      seedId, isDummy: true, eventDate: day.date, type: 'adjustment', quantity, reason,
      createdAt: atMinute(day.offset + 30 + index), createdBy: 'codex-dummy-seed',
    });
    ledgerCount += 1;
  });

  batch.set(db.collection('eventDays').doc(day.date), {
    seedId,
    isDummy: true,
    date: day.date,
    label: day.label,
    openingStock: day.openingStock,
    adjustments: day.adjustments,
    distributedZone2,
    distributedZone3,
    remainingStock: day.remainingStock,
    codes: day.codes,
    updatedAt: atMinute(day.offset + 45),
    updatedBy: 'codex-dummy-seed',
  });

  await batch.commit();
}

console.log(`Dummy participants created: ${participantCount}`);
console.log(`Dummy inventory entries created: ${ledgerCount}`);
console.log(`Event days configured: ${dayConfigs.length}`);
console.log(`Creation date: ${createdDay}`);
await deleteApp(app);
