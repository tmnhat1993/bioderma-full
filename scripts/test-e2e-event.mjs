import { createHash } from 'node:crypto';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
}) });
const db = getFirestore(app);
const baseUrl = 'http://localhost:3000';
const today = '2026-09-04';
const tomorrow = '2026-09-05';
const todayCodes = ['4101', '5202', '6303'];
const tomorrowCodes = ['7404', '8505', '9606'];
const runId = 'e2e-20260904-full-flow';
const results = [];

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function register(sequence, input, eventDate) {
  const deviceId = `${runId}-device-${sequence}`;
  const response = await post('/api/participants', { deviceId, ...input, ...(eventDate ? { eventDate } : {}) });
  if (response.status !== 200) throw new Error(`Registration ${sequence} failed: ${JSON.stringify(response.body)}`);
  await db.collection('participants').doc(response.body.id).set({ isDummy: true, testRunId: runId }, { merge: true });
  await db.collection('deviceLocks').doc(createHash('sha256').update(deviceId).digest('hex')).set({ isDummy: true, testRunId: runId }, { merge: true });
  return { participant: response.body, deviceId };
}

async function verify(flow, zone, code) {
  return post('/api/zones/verify', { participantId: flow.participant.id, deviceId: flow.deviceId, zone, code });
}

async function finishAllZones(flow, codes) {
  const states = [];
  for (let zone = 1; zone <= 3; zone += 1) {
    const response = await verify(flow, zone, codes[zone - 1]);
    if (response.status !== 200) throw new Error(`Zone ${zone} failed: ${JSON.stringify(response.body)}`);
    flow.participant = response.body.participant;
    states.push(response.body);
  }
  return states;
}

const dayTodayBefore = await db.collection('eventDays').doc(today).get();
const dayTomorrowBefore = await db.collection('eventDays').doc(tomorrow).get();
check('Kho hôm nay đã khởi tạo', dayTodayBefore.exists && dayTodayBefore.data().openingStock === 8);
check('Kho ngày mai đã khởi tạo', dayTomorrowBefore.exists && dayTomorrowBefore.data().openingStock === 10);

const flow1 = await register(1, { consent: true, fullName: 'Nguyễn An E2E', gender: 'female', ageRange: '18-24' });
check('Tự lấy ngày hiện tại khi frontend không gửi ngày', flow1.participant.eventDate === today, flow1.participant.eventDate);
const duplicate = await post('/api/participants', { deviceId: flow1.deviceId, consent: true, fullName: 'Tên bị bỏ qua', gender: 'male', ageRange: '45+' });
check('Chặn đăng ký lặp trên cùng thiết bị', duplicate.status === 200 && duplicate.body.id === flow1.participant.id);
const wrongCode = await verify(flow1, 1, '0000');
const flow1AfterWrong = await db.collection('participants').doc(flow1.participant.id).get();
check('Mã Zone sai bị từ chối', wrongCode.status === 400 && flow1AfterWrong.data().currentZone === 0, `HTTP ${wrongCode.status}`);
const flow1States = await finishAllZones(flow1, todayCodes);
check('Consent đầy đủ hoàn thành 3 Zone', flow1.participant.currentZone === 3);
check('Consent đầy đủ nhận 2 sample', flow1States[1].rewardStatus === 'received' && flow1States[2].rewardStatus === 'received');

const flow2 = await register(2, { consent: false, fullName: 'Không được lưu', gender: 'male', ageRange: '25-45' });
const flow2Stored = await db.collection('participants').doc(flow2.participant.id).get();
check('Không consent chỉ lưu dữ liệu tối thiểu', !flow2Stored.data().fullName && !flow2Stored.data().ageRange);
const flow2States = await finishAllZones(flow2, todayCodes);
check('Không consent vẫn tham gia đủ và nhận sample', flow2.participant.currentZone === 3 && flow2States[1].rewardStatus === 'received' && flow2States[2].rewardStatus === 'received');

const flow3 = await register(3, { consent: true, fullName: 'Trần Bình E2E', gender: 'male', ageRange: '25-45' });
const flow3States = await finishAllZones(flow3, todayCodes);
check('Khách thứ 3 hoàn thành đủ', flow3States[2].participant.currentZone === 3);

const flow4 = await register(4, { consent: true, fullName: 'Lê Chi E2E', gender: 'female', ageRange: '45+' });
const flow4States = await finishAllZones(flow4, todayCodes);
check('Sample cuối cùng được phát chính xác', flow4States[2].rewardStatus === 'received' && flow4States[2].remainingStock === 0);

const flow5 = await register(5, { consent: true, fullName: 'Phạm Dũng E2E', gender: 'male', ageRange: '25-45' });
await verify(flow5, 1, todayCodes[0]);
const outOfStock = await verify(flow5, 2, todayCodes[1]);
flow5.participant = outOfStock.body.participant;
check('Hết sample trả trạng thái out_of_stock', outOfStock.status === 200 && outOfStock.body.rewardStatus === 'out_of_stock' && outOfStock.body.remainingStock === 0);
check('Khách bỏ dở không bị tính hoàn thành Zone 3', flow5.participant.currentZone === 2 && !flow5.participant.zone3CompletedAt);

const flow6 = await register(6, { consent: false, gender: 'female' }, tomorrow);
const skipZone = await verify(flow6, 2, tomorrowCodes[1]);
check('Không thể bỏ qua Zone trước', skipZone.status !== 200);
const tomorrowZone1 = await verify(flow6, 1, tomorrowCodes[0]);
flow6.participant = tomorrowZone1.body.participant;
check('Khách ngày mai dừng ở Zone 1', tomorrowZone1.status === 200 && flow6.participant.currentZone === 1);

for (const flow of [flow1, flow2, flow3, flow4, flow5, flow6]) {
  const ledger = await db.collection('inventoryLedger').where('participantId', '==', flow.participant.id).get();
  for (const document of ledger.docs) await document.ref.set({ isDummy: true, testRunId: runId }, { merge: true });
}

const [todayDay, tomorrowDay, todayParticipants, tomorrowParticipants] = await Promise.all([
  db.collection('eventDays').doc(today).get(),
  db.collection('eventDays').doc(tomorrow).get(),
  db.collection('participants').where('eventDate', '==', today).get(),
  db.collection('participants').where('eventDate', '==', tomorrow).get(),
]);
const todayData = todayDay.data();
const tomorrowData = tomorrowDay.data();
check('Thống kê hôm nay đúng', todayParticipants.size === 5 && todayData.distributedZone2 === 4 && todayData.distributedZone3 === 4 && todayData.remainingStock === 0, `${todayParticipants.size} khách, ${todayData.remainingStock} tồn`);
check('Dữ liệu ngày mai không lẫn hôm nay', tomorrowParticipants.size === 1 && tomorrowData.distributedZone2 === 0 && tomorrowData.distributedZone3 === 0 && tomorrowData.remainingStock === 10, `${tomorrowParticipants.size} khách, ${tomorrowData.remainingStock} tồn`);

const failed = results.filter((result) => !result.passed);
console.log(`SUMMARY | ${results.length - failed.length}/${results.length} passed`);
await deleteApp(app);
if (failed.length) process.exitCode = 1;
