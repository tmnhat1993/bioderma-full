import { createHash } from 'node:crypto';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const baseUrl = process.env.TEST_BASE_URL || 'https://bioderma-event.com';
const eventDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const temporaryDate = '2099-12-31';
const temporaryCodes = { zone1: '4137', zone2: '5268', zone3: '6394' };
const runId = `domain-e2e-${Date.now()}`;
const results = [];

const app = initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
}) });
const db = getFirestore(app);

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
}

async function post(path, body) {
  return request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

async function adminRequest(path, idToken, method = 'GET', body) {
  return request(path, {
    method,
    headers: { authorization: `Bearer ${idToken}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function register(sequence, input) {
  const deviceId = `${runId}-device-${sequence}`;
  const response = await post('/api/participants', { deviceId, ...input });
  if (response.status !== 200) throw new Error(`Registration ${sequence}: ${JSON.stringify(response.body)}`);
  await Promise.all([
    db.collection('participants').doc(response.body.id).set({ isDummy: true, testRunId: runId }, { merge: true }),
    db.collection('deviceLocks').doc(createHash('sha256').update(deviceId).digest('hex')).set({ isDummy: true, testRunId: runId }, { merge: true }),
  ]);
  return { participant: response.body, deviceId };
}

async function verify(flow, zone, code) {
  const response = await post('/api/zones/verify', { participantId: flow.participant.id, deviceId: flow.deviceId, zone, code });
  if (response.status === 200) flow.participant = response.body.participant;
  return response;
}

async function complete(flow, codes) {
  const states = [];
  for (let zone = 1; zone <= 3; zone += 1) states.push(await verify(flow, zone, codes[`zone${zone}`]));
  return states;
}

async function cleanup() {
  const [participants, currentLedger, temporaryLedger, locks] = await Promise.all([
    db.collection('participants').where('testRunId', '==', runId).get(),
    db.collection('inventoryLedger').where('eventDate', '==', eventDate).get(),
    db.collection('inventoryLedger').where('eventDate', '==', temporaryDate).get(),
    db.collection('deviceLocks').where('testRunId', '==', runId).get(),
  ]);
  const participantIds = new Set(participants.docs.map((document) => document.id));
  const testCurrentLedger = currentLedger.docs.filter((document) => participantIds.has(document.data().participantId) || String(document.data().reason || '').includes(runId));
  const zone2Count = testCurrentLedger.filter((document) => document.data().type === 'distribution' && document.data().zone === 2).length;
  const zone3Count = testCurrentLedger.filter((document) => document.data().type === 'distribution' && document.data().zone === 3).length;
  const documents = [...participants.docs, ...testCurrentLedger, ...temporaryLedger.docs, ...locks.docs];
  for (let start = 0; start < documents.length; start += 400) {
    const batch = db.batch();
    documents.slice(start, start + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  if (zone2Count || zone3Count) {
    await db.collection('eventDays').doc(eventDate).update({
      distributedZone2: FieldValue.increment(-zone2Count),
      distributedZone3: FieldValue.increment(-zone3Count),
      remainingStock: FieldValue.increment(zone2Count + zone3Count),
    });
  }
  const temporary = await db.collection('eventDays').doc(temporaryDate).get();
  if (temporary.data()?.testRunId === runId) await temporary.ref.delete();
}

try {
  const [todayBefore, participantsBefore, temporaryBefore] = await Promise.all([
    db.collection('eventDays').doc(eventDate).get(),
    db.collection('participants').where('eventDate', '==', eventDate).get(),
    db.collection('eventDays').doc(temporaryDate).get(),
  ]);
  if (!todayBefore.exists) throw new Error(`Event day ${eventDate} is not configured`);
  if (temporaryBefore.exists) throw new Error(`Temporary date ${temporaryDate} is already in use`);
  const before = todayBefore.data();
  const codes = before.codes;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY');
  const adminUser = await getAuth(app).getUserByEmail('admin@bioderma.vn');
  const customToken = await getAuth(app).createCustomToken(adminUser.uid);
  const tokenResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.idToken) throw new Error('Could not create CMS test session');
  const idToken = tokenData.idToken;

  const [home, wwwHome, adminLogin, unauthorized] = await Promise.all([
    request('/'), fetch('https://www.bioderma-event.com/'), request('/bio-admin-9x32/login'), request('/api/admin/days'),
  ]);
  check('HTTPS domain gốc trả HTTP 200', home.status === 200);
  check('HTTPS www trả HTTP 200', wwwHome.status === 200);
  check('Trang đăng nhập CMS trả HTTP 200', adminLogin.status === 200);
  check('API CMS chặn truy cập chưa đăng nhập', unauthorized.status === 401, `HTTP ${unauthorized.status}`);

  const createDay = await adminRequest('/api/admin/data', idToken, 'PATCH', {
    action: 'createDay', eventDate: temporaryDate, openingStock: 5, codes: temporaryCodes,
  });
  check('CMS tạo ngày và kho mới', createDay.status === 200 && createDay.body.remainingStock === 5);
  await db.collection('eventDays').doc(temporaryDate).set({ isDummy: true, testRunId: runId }, { merge: true });
  const days = await adminRequest('/api/admin/days', idToken);
  check('CMS tải danh sách ngày', days.status === 200 && Array.isArray(days.body) && days.body.some((day) => day.date === temporaryDate));
  const adjustment = await adminRequest('/api/admin/data', idToken, 'PATCH', {
    action: 'adjustStock', eventDate: temporaryDate, quantity: 2, reason: `[E2E ${runId}]`,
  });
  check('CMS điều chỉnh tăng tồn kho', adjustment.status === 200 && adjustment.body.remainingStock === 7);
  const rollbackAdjustment = await adminRequest('/api/admin/data', idToken, 'PATCH', {
    action: 'adjustStock', eventDate: temporaryDate, quantity: -2, reason: `[E2E rollback ${runId}]`,
  });
  check('CMS điều chỉnh giảm tồn kho', rollbackAdjustment.status === 200 && rollbackAdjustment.body.remainingStock === 5);

  const flow1 = await register(1, { consent: true, fullName: '[E2E] Consent', phone: '0900000010', gender: 'female', ageRange: '18-24' });
  check('Frontend tự lấy đúng ngày Việt Nam', flow1.participant.eventDate === eventDate, flow1.participant.eventDate);
  const duplicate = await post('/api/participants', { deviceId: flow1.deviceId, consent: true, fullName: 'Duplicate', phone: '0900000011', gender: 'male', ageRange: '45+' });
  check('Chặn đăng ký lặp trên cùng thiết bị', duplicate.status === 200 && duplicate.body.id === flow1.participant.id);
  const wrong = await verify(flow1, 1, '0000');
  check('Từ chối mã Zone sai', wrong.status === 400, `HTTP ${wrong.status}`);
  const states1 = await complete(flow1, codes);
  check('Consent hoàn thành đủ 3 Zone', states1.every((state) => state.status === 200) && flow1.participant.currentZone === 3);
  check('Consent nhận sample tại Zone 2 và 3', states1[1].body.rewardStatus === 'received' && states1[2].body.rewardStatus === 'received');

  const flow2 = await register(2, { consent: false, fullName: 'Không được lưu', gender: 'male', ageRange: '25-45' });
  const stored2 = await db.collection('participants').doc(flow2.participant.id).get();
  check('Không consent chỉ lưu giới tính và tuổi, không lưu họ tên/số điện thoại', !stored2.data().fullName && !stored2.data().phone && stored2.data().gender === 'male' && stored2.data().ageRange === '25-45');
  const states2 = await complete(flow2, codes);
  check('Không consent vẫn hoàn thành và nhận sample', states2.every((state) => state.status === 200) && states2[1].body.rewardStatus === 'received' && states2[2].body.rewardStatus === 'received');

  const flow3 = await register(3, { consent: true, fullName: '[E2E] Dừng Zone 1', phone: '0900000012', gender: 'female', ageRange: '25-45' });
  const skip = await verify(flow3, 2, codes.zone2);
  check('Không cho bỏ qua Zone trước', skip.status !== 200, `HTTP ${skip.status}`);
  const partial = await verify(flow3, 1, codes.zone1);
  check('Luồng dừng giữa chừng giữ đúng Zone 1', partial.status === 200 && flow3.participant.currentZone === 1);

  const cmsData = await adminRequest(`/api/admin/data?eventDate=${eventDate}`, idToken);
  check('CMS đọc đúng dữ liệu ngày hiện tại', cmsData.status === 200 && cmsData.body.eventDay.date === eventDate);
  check('CMS thống kê tăng đúng số khách test', cmsData.body.participants.length === participantsBefore.size + 3, `${cmsData.body.participants.length} khách tổng`);
  check('CMS thống kê phát sample đúng', cmsData.body.eventDay.distributedZone2 === before.distributedZone2 + 2 && cmsData.body.eventDay.distributedZone3 === before.distributedZone3 + 2 && cmsData.body.eventDay.remainingStock === before.remainingStock - 4);

  const failed = results.filter((result) => !result.passed);
  console.log(`SUMMARY | ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
} finally {
  await cleanup();
  const [day, participants, locks] = await Promise.all([
    db.collection('eventDays').doc(temporaryDate).get(),
    db.collection('participants').where('testRunId', '==', runId).get(),
    db.collection('deviceLocks').where('testRunId', '==', runId).get(),
  ]);
  console.log(`CLEANUP | temporaryDay=${day.exists} participants=${participants.size} locks=${locks.size}`);
  await deleteApp(app);
}
