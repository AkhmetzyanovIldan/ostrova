import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync} from 'node:fs';
import {once} from 'node:events';
import {generateMap} from '../shared/engine.mjs';
mkdirSync('artifacts',{recursive:true});
const dataDir=mkdtempSync('artifacts/server-test-');
const base='http://127.0.0.1:3098';
let child;
async function start(){child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'3098',HOST:'127.0.0.1',DATA_DIR:dataDir,ALLOW_GUESTS:'true',NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server failed to start')),8000);child.stdout.on('data',buf=>{if(buf.toString().includes('Antiyoy Friends:')){clearTimeout(timer);resolve()}});child.on('exit',code=>{clearTimeout(timer);reject(new Error(`Server exited ${code}`))})});}
async function stop(){if(child?.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}}
function client(){let cookie='';return async(url,data,extra={})=>{const r=await fetch(base+url,{method:data===undefined?'GET':'POST',headers:{Cookie:cookie,...(data===undefined?{}:{'Content-Type':'application/json',Origin:base}),...extra},body:data===undefined?undefined:JSON.stringify(data)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();return {status:r.status,body,cookie};};}
test('real HTTP multiplayer: permissions, six players, SSE, concurrency, rejoin, persistence',{timeout:30000},async()=>{
  await start();
  try{
    const users=Array.from({length:7},client);
    for(let i=0;i<users.length;i++)assert.equal((await users[i]('/api/session',{name:`Test ${i}`})).status,200);
    const created=await users[0]('/api/rooms',{map:generateMap({players:6,radius:6,seed:777})});assert.equal(created.status,201);let room=created.body;const path=`/api/rooms/${room.code}`;
    assert.equal((await users[6](path)).status,403);
    assert.equal((await users[0](`${path}/start`,{revision:room.revision})).status,400);
    for(let i=1;i<6;i++){const joined=await users[i](`${path}/join`,{});assert.equal(joined.status,200);room=joined.body;}
    assert.equal((await users[6](`${path}/join`,{})).status,400);
    assert.equal((await users[1](`${path}/start`,{revision:room.revision})).status,403);
    for(let i=1;i<6;i++){room=(await users[i](`${path}/ready`,{revision:room.revision,ready:true})).body;}
    room=(await users[0](`${path}/start`,{revision:room.revision})).body;assert.equal(room.status,'playing');
    const cookie=(await users[1]('/api/me')).cookie,controller=new AbortController();
    const eventResponse=await fetch(base+path+'/events',{headers:{Cookie:cookie},signal:controller.signal});assert.equal(eventResponse.status,200);
    const reader=eventResponse.body.getReader();let text='';while(!text.includes('event: room')){text+=new TextDecoder().decode((await reader.read()).value)}assert.match(text,/"playing"/);
    assert.equal((await users[1](`${path}/action`,{revision:room.revision,action:{type:'end'}})).status,400);
    assert.equal((await users[0](`${path}/action`,{revision:room.revision,action:{type:'end'}},{Origin:'https://evil.invalid'})).status,403);
    const simultaneous=await Promise.all([users[0](`${path}/action`,{revision:room.revision,action:{type:'end'}}),users[0](`${path}/action`,{revision:room.revision,action:{type:'end'}})]);
    assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);room=simultaneous.find(r=>r.status===200).body;assert.equal(room.game.turn,1);
    let updated='';while(!updated.includes('"turn":1'))updated+=new TextDecoder().decode((await reader.read()).value);assert.match(updated,/"turn":1/);controller.abort();
    const rejoined=(await users[1](`${path}/join`,{})).body;assert.equal(rejoined.me,1);assert.equal(rejoined.players.length,6);assert.equal(rejoined.game.turn,1);
    await stop();await start();const restored=(await users[0](path)).body;assert.equal(restored.game.turn,1);assert.equal(restored.revision,room.revision);
    const map=generateMap({players:2,seed:890});const saved=await users[0]('/api/maps',{map});assert.equal(saved.status,201);assert.equal((await users[0]('/api/maps')).body.length,1);assert.equal((await users[1]('/api/maps')).body.length,0);
    assert.equal((await users[6]('/api/rooms',{map:{cells:{}}})).status,400);
    const staticResponse=await fetch(base+'/');assert.equal(staticResponse.status,200);assert.match(await staticResponse.text(),/Захватчики/);
    const secretResponse=await fetch(base+'/.env');assert.equal(secretResponse.status,404);
  }finally{await stop()}
});
test('lobby host transfer and empty-room reuse remain startable',{timeout:15000},async()=>{
  await start();try{
    const a=client(),b=client();await a('/api/session',{name:'Host'});await b('/api/session',{name:'Guest'});
    let r=(await a('/api/rooms',{map:generateMap({seed:55})})).body,p=`/api/rooms/${r.code}`;r=(await b(p+'/join',{})).body;
    await a(p+'/leave',{revision:r.revision});r=(await b(p)).body;assert.equal(r.host,true);assert.equal(r.players[0].ready,true);
    await b(p+'/leave',{revision:r.revision});r=(await a(p+'/join',{})).body;assert.equal(r.host,true);assert.equal(r.players[0].ready,true);
  }finally{await stop()}
});

test('server undo persists across restart, is private to active player and ends with turn; messages do not race moves',{timeout:20000},async()=>{
  await start();try{
    const a=client(),b=client(),outsider=client();
    await a('/api/session',{name:'Undo host'});await b('/api/session',{name:'Undo guest'});await outsider('/api/session',{name:'Outside'});
    const map=generateMap({players:2,seed:80,trees:false});map.startingMoney=60;
    let r=(await a('/api/rooms',{map})).body;const path=`/api/rooms/${r.code}`;
    r=(await b(path+'/join',{})).body;r=(await b(path+'/ready',{revision:r.revision,ready:true})).body;
    r=(await a(path+'/start',{revision:r.revision})).body;
    const original=structuredClone(r.game),province=r.game.provinces.find(p=>p.owner===0),to=province.cells.find(id=>!r.game.cells[id].building);
    assert.equal(r.canUndo,false);
    r=(await a(path+'/action',{revision:r.revision,action:{type:'recruit',level:2,province:province.capital,to}})).body;
    assert.equal(r.canUndo,true);assert.equal(r.game.cells[to].unit.level,2);
    assert.equal((await b(path)).body.canUndo,false);
    assert.equal((await b(path+'/action',{revision:r.revision,action:{type:'undo'}})).status,403);
    assert.equal((await a(path+'/action',{revision:r.revision-1,action:{type:'undo'}})).status,409);
    await stop();await start();r=(await a(path)).body;assert.equal(r.canUndo,true);
    const revision=r.revision,guestCapital=r.game.provinces.find(p=>p.owner===1).capital;
    const message=await b(path+'/message',{text:'<img src=x onerror=alert(1)>',capital:province.capital});
    assert.equal(message.status,200);assert.equal(message.body.revision,revision);
    assert.equal(message.body.messages[0].capital,guestCapital);assert.equal(message.body.messages[0].seat,1);
    assert.equal(message.body.messages[0].expiresAt-message.body.serverTime<=5000,true);
    assert.equal((await b(path+'/message',{text:'Again'})).status,400);
    assert.equal((await outsider(path+'/message',{text:'Not a member'})).status,403);
    r=(await a(path+'/action',{revision,action:{type:'undo'}})).body;
    assert.deepEqual(r.game,original);assert.equal(r.canUndo,false);assert.equal(r.messages.length,1);
    assert.equal((await a(path+'/action',{revision:r.revision,action:{type:'undo'}})).status,400);
    r=(await a(path+'/action',{revision:r.revision,action:{type:'build',building:'tower',province:province.capital,to}})).body;
    assert.equal(r.game.cells[to].building,'tower');assert.equal(r.canUndo,true);
    r=(await a(path+'/action',{revision:r.revision,action:{type:'end'}})).body;
    assert.equal(r.canUndo,false);assert.equal((await b(path+'/action',{revision:r.revision,action:{type:'undo'}})).status,400);
    r=(await a(path+'/action',{revision:r.revision,action:{type:'surrender'}})).body;
    assert.equal(r.status,'finished');assert.equal(r.game.winner,1);
    assert.equal((await b(path+'/message',{text:'Finished'})).status,400);
  }finally{await stop()}
});
