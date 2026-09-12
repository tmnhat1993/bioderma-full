/* eslint-disable @typescript-eslint/no-require-imports, @next/next/no-assign-module-variable */
// Exercises the real route handlers against an isolated in-memory Firestore adapter.
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const assert=require('node:assert/strict');const {NextRequest}=require('next/server');
let today='2026-09-12';let history=0;const docs=new Map();
const snapshot=(id)=>({id:id.split('/').at(-1),data:()=>docs.get(id),exists:docs.has(id)});
const db={
  collection(name){
    return {
      doc(id=`history-${++history}`){return {path:`${name}/${id}`,async get(){return snapshot(`${name}/${id}`);}};},
      where(field,op,value){return {async get(){return {docs:[...docs].filter(([key,p])=>key.startsWith(`${name}/`)&&p[field]===value).map(([key])=>snapshot(key))};}};},
    };
  },
  async runTransaction(fn){return fn({get:async ref=>snapshot(ref.path),update(ref,value){docs.set(ref.path,{...docs.get(ref.path),...value});},set(ref,value){docs.set(ref.path,value);}});},
};
const cache={};function load(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,Buffer,process,require(name){if(name==='@/lib/server/firebase-admin')return {getAdminDb:()=>db};if(name==='@/lib/constants')return {getVietnamDate:()=>today};if(name==='@/lib/server/pg-access')return {validPgAccess:v=>v==='test-key'};if(name==='@/lib/server/helpers')return {hash:v=>require('node:crypto').createHash('sha256').update(v).digest('hex')};if(name==='@/lib/extra-gifts')return load('lib/extra-gifts.ts');return require(name);}});return cache[file]=module.exports;}
const route=load('app/api/pg-extra/route.ts');const status=load('app/api/participants/extra-gift/route.ts');
const request=(body,key='test-key')=>new NextRequest('http://localhost/api/pg-extra',{method:body?'POST':'GET',headers:{'x-pg-key':key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const guest={eventDate:today,currentZone:3,consent:true,fullName:'Test',publicCode:'TEST-1',createdAt:'2026-09-12T03:00:00Z',deviceHash:require('node:crypto').createHash('sha256').update('device').digest('hex')};
docs.set('participants/a',{...guest});docs.set('participants/old',{...guest,eventDate:'2026-09-11'});docs.set('participants/partial',{...guest,currentZone:2});docs.set('participants/anon',{...guest,consent:false,phone:'must-not-leak'});docs.set('eventDays/2026-09-12',{remainingStock:986});
(async()=>{
  assert.equal((await route.GET(request(null,'wrong'))).status,404);
  const list=await (await route.GET(request())).json();assert.equal(list.guests.length,2);assert.equal(list.guests.find(p=>p.id==='anon').fullName,undefined);assert.equal(list.guests[0].deviceHash,undefined);
  const body={participantId:'a',gift:'Kit sampling',revision:0,date:today};
  assert.equal((await route.POST(request({...body,participantId:'old'}))).status,409);
  assert.equal((await route.POST(request({...body,participantId:'partial'}))).status,409);
  assert.equal((await route.POST(request({...body,gift:'Invalid'}))).status,400);
  assert.equal((await route.POST(request({...body,date:'2026-09-11'}))).status,409);
  assert.equal((await route.POST(request(body))).status,200);
  assert.equal(docs.get('participants/a').extraGift.gift,'Kit sampling');
  assert.equal((await route.POST(request(body))).status,409);
  const awardedAt=docs.get('participants/a').extraGift.awardedAt;
  assert.equal((await route.POST(request({...body,gift:'Bình thuỷ tinh',revision:1}))).status,200);
  assert.equal(docs.get('participants/a').extraGift.revision,2);assert.equal(docs.get('participants/a').extraGift.awardedAt,awardedAt);
  assert.equal((await route.POST(request({...body,gift:'Bình thuỷ tinh',revision:2}))).status,200);
  assert.equal([...docs.keys()].filter(k=>k.startsWith('extraGiftHistory/')).length,2);
  assert.equal(docs.get('eventDays/2026-09-12').remainingStock,986);assert.equal(docs.get('participants/a').currentZone,3);
  assert.equal((await status.POST(request({participantId:'a',deviceId:'wrong'}))).status,403);
  assert.equal((await (await status.POST(request({participantId:'a',deviceId:'device'}))).json()).received,true);
  today='2026-09-13';assert.equal((await route.POST(request({...body,revision:2}))).status,409);assert.equal((await (await route.GET(request())).json()).guests.length,0);
  console.log('PASS: access, today-only, completion eligibility, consent minimization, gift validation, save/edit/revision conflict, idempotence, history, stock unchanged, device status, midnight rollover. No Firebase writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
