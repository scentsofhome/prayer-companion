const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
function store() {
  const data=new Map();
  return {getItem:key => data.has(key)?data.get(key):null,setItem:(key,value) => data.set(key,String(value)),removeItem:key => data.delete(key)};
}
function appHarness() {
  const elements=new Map();
  const element=() => ({innerHTML:'',textContent:'',scrollTop:0,scrollHeight:2000,clientHeight:500,hidden:false,dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},setAttribute(){},removeAttribute(){},scrollTo(){},focus(){}});
  const document={getElementById:id=>{if(!elements.has(id))elements.set(id,element()); return elements.get(id);},documentElement:element(),body:element(),querySelector:()=>element(),querySelectorAll:()=>[],addEventListener(){},visibilityState:'visible'};
  const window={addEventListener(){},dispatchEvent(){},matchMedia:()=>({matches:false,addEventListener(){}}),innerWidth:390,isSecureContext:true};
  const context=vm.createContext({window,document,localStorage:store(),sessionStorage:store(),navigator:{onLine:false},location:{hostname:'localhost',protocol:'http:'},history:{state:null,replaceState(){},pushState(){}},console,URL,Blob,File,AbortController,CustomEvent:class{},MessageChannel,Date,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:fn=>fn()});
  const run=code=>vm.runInContext(code,context);
  for (const file of ['src/session-time.js','src/offline.js','src/backup.js'])run(read(file));
  run(read('src/app.js').replace(/init\(\);\s*$/, ''));
  const p=JSON.parse(read('data/prayers.json'));p.prayers.push(...JSON.parse(read('data/public-domain-prayers.json')).prayers);
  run(`prayersData=${JSON.stringify(p)}; rulesData=${read('data/prayer-rules.json')}; allPrayers=prayersData.prayers.filter(p=>p.type==='prayer'); byId=new Map(prayersData.prayers.map(p=>[p.id,p]));`);
  return {context,run,elements};
}
function workerHarness() {
  const events={}, cachesMap=new Map(); let offline=false, failedPath=null, skipped=false, claims=0, network=0;
  const scope='https://example.test/prayer-companion/';
  const key=request=>typeof request==='string'?new URL(request,scope).href:request.url;
  const fetch=async request=>{
    network++; if(offline || (failedPath && key(request).includes(failedPath)))throw new TypeError('offline');
    const file=new URL(key(request)).pathname.replace('/prayer-companion/','')||'index.html';
    return new Response(fs.readFileSync(path.join(root,file)),{status:200});
  };
  const caches={open:async name=>{
    if(!cachesMap.has(name))cachesMap.set(name,new Map()); const items=cachesMap.get(name);
    return {match:async request=>items.get(key(request))?.clone(),addAll:async requests=>{const fetched=await Promise.all(requests.map(async request=>[key(request),await fetch(request)]));for(const [k,r] of fetched)items.set(k,r);}};
  },keys:async()=>[...cachesMap.keys()],delete:async name=>cachesMap.delete(name)};
  const self={registration:{scope},location:{origin:new URL(scope).origin},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:()=>{skipped=true;},clients:{claim:async()=>{claims++;}}};
  const context=vm.createContext({self,caches,Request,Response,URL,fetch});vm.runInContext(read('service-worker.js'),context);
  const dispatch=async(name,extra={})=>{let promise;events[name]({...extra,waitUntil:p=>promise=p,respondWith:p=>promise=p});return await promise;};
  return {dispatch,cachesMap,context,scope,setOffline:value=>offline=value,setFailed:value=>failedPath=value,getNetwork:()=>network,getSkipped:()=>skipped,getClaims:()=>claims};
}
test('complete install serves navigation and every required asset with no network',async()=>{
  const h=workerHarness();await h.dispatch('install');assert.equal(h.getSkipped(),false);
  await h.dispatch('activate');assert.equal(h.getClaims(),1);
  const files=vm.runInContext('APP_SHELL',h.context);assert.equal(files.length,31);
  h.setOffline(true);const before=h.getNetwork();
  for(const file of files){const response=await h.dispatch('fetch',{request:new Request(new URL(file,h.scope))});assert.equal(response.status,200);}
  const page=await h.dispatch('fetch',{request:{url:h.scope+'?installed=1',mode:'navigate',method:'GET'}});assert.match(await page.text(),/Prayer Rule/);
  assert.equal(h.getNetwork(),before);
  let status;await h.dispatch('message',{data:{type:'OFFLINE_STATUS'},ports:[{postMessage:s=>status=s}]});assert.equal(status.ready,true);
});
test('failed download cannot create a partial offline book or delete unrelated caches',async()=>{
  const h=workerHarness();h.cachesMap.set('other-app-cache',new Map());h.setFailed('prayers.json');
  await assert.rejects(()=>h.dispatch('install'));
  assert.equal(h.getSkipped(),false);
  let status;await h.dispatch('message',{data:{type:'OFFLINE_STATUS'},ports:[{postMessage:s=>status=s}]});assert.equal(status.ready,false);
  h.setFailed(null);await h.dispatch('install');await h.dispatch('activate');assert(h.cachesMap.has('other-app-cache'));
});
test('missing assets are detected and a matching release can repair the download',async()=>{
  const h=workerHarness();await h.dispatch('install');const book=[...h.cachesMap.values()][0];book.delete(h.scope+'data/prayers.json');
  let status;const message=type=>h.dispatch('message',{data:{type},ports:[{postMessage:s=>status=s}]});
  await message('OFFLINE_STATUS');assert.equal(status.ready,false);
  await message('REPAIR_DOWNLOAD');assert.equal(status.ready,true);
  await message('OFFLINE_STATUS');assert.equal(status.ready,true);
  await message('ACTIVATE_UPDATE');assert.equal(h.getSkipped(),true);
});
test('external requests do not enter offline handling',async()=>{
  const h=workerHarness();assert.equal(await h.dispatch('fetch',{request:new Request('https://calendar.test/daily')}),undefined);
});
test('home, library, search, settings, and reader render from bundled data',()=>{
  const h=appHarness();
  for(const view of ['home','library','search','settings']){h.run(`render('${view}')`);assert(!h.elements.get('screen').innerHTML.includes('undefined'));}
  h.run('startRule()');assert.match(h.elements.get('screen').innerHTML,/reader-stage/);
  assert(h.run('reader.steps.length')>0);
});
test('first-prayer position and exact prayer sequence survive resume',()=>{
  const h=appHarness();h.run('startRule()');
  const ids=h.run('JSON.stringify(reader.steps)');
  h.elements.get('reader-stage').scrollTop=825;h.run('saveCurrentReadingPosition()');
  assert.equal(h.run('getSavedReader().index'),0);assert.equal(h.run('getSavedReader().position'),.55);
  h.run('reader=null; prayerHistory=Object.fromEntries(allPrayers.map(p=>[p.id,Date.now()]));');
  assert.equal(h.run('JSON.stringify(currentSteps())'),ids);
  h.run('startRule(savedReaderForCurrentRule().index,savedReaderForCurrentRule().position)');
  assert.equal(h.run('reader.position'),.55);
  h.run("selectedDay = dayNames[(dayNames.indexOf(selectedDay)+1)%7]");assert.equal(h.run('savedReaderForCurrentRule()'),null);
});
test('offline search matches prayer needs, and settings have no glass controls',()=>{
  const h=appHarness();assert(h.run("searchPrayers('healing',true).length")>0);
  const settings=h.run('renderSettings()');assert(!settings.includes('Glass clarity'));assert(settings.includes('Save backup'));
  assert.equal(h.run("primaryTabForView('search')"),'library');
});
test('backup round trip preserves names, favourites and settings; malformed input is rejected',()=>{
  const h=appHarness();h.run("personal.living=['Nicolas']; favorites.add(allPrayers[0].id); savePersonal(); saveFavorites();");
  const snapshot=JSON.parse(h.run('JSON.stringify(backupSnapshot())'));
  const api=h.context.window.PrayerBackup;assert.equal(api.validate(snapshot).personal.living[0],'Nicolas');
  const target=store();api.restore(target,h.run('STORAGE'),snapshot.data);
  assert.deepEqual(JSON.parse(target.getItem(h.run('STORAGE.personal'))).living,['Nicolas']);
  for(const mutate of [b=>b.data.appearance.scale='large',b=>b.data.personal.living='Nicolas',b=>b.data.positions.bad=2,b=>b.data.reader={index:0,position:.2,steps:[{type:'psalms',psalms:3}]},b=>b.format=99]) {
    const bad=structuredClone(snapshot);mutate(bad);assert.throws(()=>api.validate(bad));
  }
  assert.throws(()=>api.validate(JSON.parse(JSON.stringify(snapshot).replace('"living":','"__proto__":{},"living":'))));
});
test('backup writes roll back if device storage fails',()=>{
  const h=appHarness();const api=h.context.window.PrayerBackup;const data=JSON.parse(h.run('JSON.stringify(backupSnapshot().data)'));const target=store();const keys=h.run('STORAGE');
  target.setItem(keys.state,'old state');const set=target.setItem;let count=0;
  target.setItem=(key,value)=>{if(++count===4)throw new Error('quota');set(key,value);};
  assert.throws(()=>api.restore(target,keys,data));assert.equal(target.getItem(keys.state),'old state');assert.equal(target.getItem(keys.appearance),null);
});
