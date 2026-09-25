import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomMessages} from '../server/messages.mjs';
import {makeUndoPatch,restoreUndoPatch} from '../server/undo.mjs';
import {createGame,generateMap,applyAction} from '../shared/engine.mjs';
test('messages expire at exactly five seconds and cooldown follows expiry',()=>{
  const messages=new RoomMessages(),game=createGame(generateMap({players:2,seed:5})),room={code:'ABC123',status:'playing',game};
  const m=messages.send(room,0,'  Привет!  ',null,1000);
  assert.equal(m.text,'Привет!');assert.equal(m.expiresAt,6000);
  assert.equal(messages.active(room.code,5999).length,1);
  assert.throws(()=>messages.send(room,0,'Ещё',null,5999),/пять секунд/);
  assert.equal(messages.active(room.code,6000).length,0);
  messages.send(room,0,'Снова',null,6000);messages.cleanup(11000);
  assert.equal(messages.rooms.size,0);
  assert.throws(()=>messages.send(room,0,' '.repeat(10),null,12000),/120/);
  assert.throws(()=>messages.send(room,0,'a'.repeat(121),null,12000),/120/);
});
test('undo patch restores recruitment and budget without copying unchanged cells',()=>{
  const before=createGame(generateMap({players:2,seed:5,trees:false})),p=before.provinces[0];
  const to=p.cells.find(id=>!before.cells[id].building);
  const after=applyAction(before,0,{type:'recruit',province:p.capital,to,level:1});
  const patch=makeUndoPatch(before,after);
  assert.equal(Object.keys(patch.cells).length,1);
  assert.deepEqual(restoreUndoPatch(after,patch),before);
  assert.throws(()=>restoreUndoPatch({...after,ply:1},patch),/текущего хода/);
});
