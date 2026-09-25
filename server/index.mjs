import http from 'node:http';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { applyAction, createGame, generateMap, validateMap } from '../shared/engine.mjs';
import { validateTelegramInitData, makeToken, hashToken } from './auth.mjs';
import {makeUndoPatch,restoreUndoPatch} from './undo.mjs';
import {RoomMessages} from './messages.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const dataDir=path.resolve(process.env.DATA_DIR||path.join(root,'data'));
mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'antiyoy.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user TEXT NOT NULL,expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY,body TEXT NOT NULL,updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS maps(id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,body TEXT NOT NULL,updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS room_undo(id INTEGER PRIMARY KEY AUTOINCREMENT,room TEXT NOT NULL,body TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS undo_room ON room_undo(room,id);`);
const streams=new Map(), rate=new Map(), messages=new RoomMessages();
const lastUndo=code=>db.prepare('SELECT id,body FROM room_undo WHERE room=? ORDER BY id DESC LIMIT 1').get(code);
const production=process.env.NODE_ENV==='production';
const guestAllowed=process.env.ALLOW_GUESTS==='true'||(!production&&process.env.ALLOW_GUESTS!=='false');
const publicOrigin=process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL).origin : process.env.RENDER_EXTERNAL_URL ? new URL(process.env.RENDER_EXTERNAL_URL).origin : null;
if(production&&!publicOrigin)throw new Error('PUBLIC_URL is required in production');
if(production&&!guestAllowed&&!process.env.BOT_TOKEN)throw new Error('BOT_TOKEN is required when guest access is disabled');

function error(message,status=400){const e=new Error(message);e.status=status;throw e}
function json(res,status,data,headers={}) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data))}
function cookie(req){return req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('ay_session='))?.slice(11)}
function userOf(req) {
  const token=cookie(req); if(!token)return null;
  const row=db.prepare('SELECT user,expires FROM sessions WHERE token=?').get(hashToken(token));
  return row&&row.expires>Date.now()?JSON.parse(row.user):null;
}
function requireUser(req){const user=userOf(req);if(!user)error('Войдите, чтобы играть',401);return user}
async function bodyOf(req) {
  if(!String(req.headers['content-type']||'').startsWith('application/json'))error('Ожидается JSON',415);
  let size=0,parts=[];
  for await(const chunk of req){size+=chunk.length;if(size>300000)error('Слишком большая карта',413);parts.push(chunk)}
  try{return JSON.parse(Buffer.concat(parts).toString()||'{}')}catch{error('Некорректный JSON')}
}
function saveRoom(room){room.updated=Date.now();db.prepare('INSERT INTO rooms(code,body,updated) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET body=excluded.body,updated=excluded.updated').run(room.code,JSON.stringify(room),room.updated)}
function loadRoom(code){const row=db.prepare('SELECT body FROM rooms WHERE code=?').get(code);if(!row)error('Комната не найдена. Проверьте код',404);return JSON.parse(row.body)}
function seatOf(room,user){return room.players.find(p=>p.id===user.id)}
function requireMember(room,user){if(!seatOf(room,user))error('Сначала присоединитесь к комнате',403)}
function presence(code,id){return [...(streams.get(code)||[])].some(s=>s.user.id===id)}
function publicRoom(room,user){return {code:room.code,name:room.name,capacity:room.capacity,status:room.status,revision:room.revision,host:room.host===user.id,me:seatOf(room,user)?.seat??-1,players:room.players.map(p=>({name:p.name,seat:p.seat,ready:p.ready,host:p.id===room.host,online:presence(room.code,p.id)})),map:room.map,game:room.game,canUndo:room.status==='playing'&&room.game?.turn===seatOf(room,user)?.seat&&!!lastUndo(room.code),messages:messages.active(room.code),serverTime:Date.now(),updated:room.updated}}
function broadcast(room){for(const stream of streams.get(room.code)||[])stream.res.write(`id: ${room.revision}\nevent: room\ndata: ${JSON.stringify(publicRoom(room,stream.user))}\n\n`)}
function commit(room){room.revision++;saveRoom(room);broadcast(room)}
function memberRooms(user){return db.prepare('SELECT body FROM rooms ORDER BY updated DESC LIMIT 500').all().map(r=>JSON.parse(r.body)).filter(r=>seatOf(r,user)).slice(0,12).map(r=>({code:r.code,name:r.name,status:r.status,players:r.players.length,capacity:r.capacity,round:r.game?.round||0,updated:r.updated}))}
function throttle(req){
  const ip=req.socket.remoteAddress||'unknown', now=Date.now();
  let slot=rate.get(ip);if(!slot||now-slot.time>60000){slot={time:now,count:0};rate.set(ip,slot)}
  if(++slot.count>360)error('Слишком много запросов. Подождите минуту',429);
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org");
  try {
    const url=new URL(req.url,'http://localhost'),route=url.pathname;
    if(route==='/health'){json(res,200,{ok:true});return}
    if(!route.startsWith('/api/')) {
      if(req.method!=='GET'&&req.method!=='HEAD')error('Метод не поддерживается',405);
      const raw=decodeURIComponent(route);
      if(raw.includes('\0')||raw.includes('\\'))error('Не найдено',404);
      const base=raw.startsWith('/shared/')?path.join(root,'shared'):path.join(root,'public');
      const relative=raw.startsWith('/shared/')?raw.slice(8):raw==='/'?'index.html':raw.slice(1);
      const file=path.resolve(base,relative);
      if(!file.startsWith(base+path.sep)||!types[path.extname(file)]||!existsSync(file))error('Не найдено',404);
      const body=readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body);return;
    }
    throttle(req);
    if(req.method!=='GET') {
      const expected=publicOrigin||`http://${req.headers.host}`;
      if(req.headers.origin&&req.headers.origin!==expected)error('Недопустимый источник запроса',403);
      if(req.headers['sec-fetch-site']==='cross-site')error('Недопустимый источник запроса',403);
    }
    if(route==='/api/config'){json(res,200,{guestAllowed,telegram:!!process.env.BOT_TOKEN,botUsername:process.env.BOT_USERNAME||'',appName:process.env.TELEGRAM_APP_NAME||''});return}
    if(route==='/api/session'&&req.method==='POST') {
      const data=await bodyOf(req);let user;
      if(data.initData){try{user=validateTelegramInitData(data.initData,process.env.BOT_TOKEN)}catch(e){error(e.message,401)}}
      else {if(!guestAllowed)error('Откройте игру через Telegram',403);const name=String(data.name||'').trim().slice(0,24);if(!name)error('Введите имя');user=userOf(req)||{id:`guest:${randomUUID()}`,telegram:false};user.name=name;}
      const token=makeToken(),expires=Date.now()+30*86400000;
      db.prepare('INSERT INTO sessions(token,user,expires) VALUES(?,?,?)').run(hashToken(token),JSON.stringify(user),expires);
      json(res,200,{user,rooms:memberRooms(user)},{'Set-Cookie':`ay_session=${token}; HttpOnly; SameSite=${production?'None':'Lax'}; Path=/; Max-Age=2592000${production?'; Secure; Partitioned':''}`});return;
    }
    if(route==='/api/me'){const user=userOf(req);json(res,200,{user,rooms:user?memberRooms(user):[]});return}
    const user=requireUser(req);
    if(route==='/api/maps'&&req.method==='GET'){json(res,200,db.prepare('SELECT id,name,body,updated FROM maps WHERE owner=? ORDER BY updated DESC LIMIT 50').all(user.id).map(r=>({...r,map:JSON.parse(r.body),body:undefined})));return}
    if(route==='/api/maps'&&req.method==='POST'){
      const data=await bodyOf(req),map=validateMap(data.map),id=randomUUID();
      const count=db.prepare('SELECT COUNT(*) AS n FROM maps WHERE owner=?').get(user.id).n;
      if(count>=50)error('Можно сохранить до 50 карт. Экспортируйте карту в файл');
      db.prepare('INSERT INTO maps VALUES(?,?,?,?,?)').run(id,user.id,map.name,JSON.stringify(map),Date.now());json(res,201,{id});return;
    }
    if(route==='/api/rooms'&&req.method==='POST'){
      const data=await bodyOf(req),map=validateMap(data.map||generateMap({players:data.players,radius:data.radius,seed:data.seed}));
      if(memberRooms(user).filter(r=>r.status==='lobby').length>=10)error('Сначала используйте уже созданную комнату');
      let code;do{code=randomBytes(5).toString('hex').toUpperCase()}while(db.prepare('SELECT code FROM rooms WHERE code=?').get(code));
      const room={code,name:String(data.name||map.name).slice(0,40),capacity:map.playerCount,map,host:user.id,players:[{...user,seat:0,ready:true}],status:'lobby',revision:1,game:null,created:Date.now()};
      saveRoom(room);json(res,201,publicRoom(room,user));return;
    }
    const match=route.match(/^\/api\/rooms\/([A-Z0-9]{6,12})(?:\/(join|events|ready|start|action|leave|map|message))?$/);
    if(!match)error('Не найдено',404);
    const [,code,operation]=match;
    if(operation==='join'&&req.method==='POST'){
      await bodyOf(req);const room=loadRoom(code);
      if(!seatOf(room,user)){
        if(room.status!=='lobby')error('Партия уже началась');if(room.players.length>=room.capacity)error('В комнате нет свободных мест');
        const seat=Array.from({length:room.capacity},(_,i)=>i).find(i=>!room.players.some(p=>p.seat===i));
        if(room.players.length===0)room.host=user.id;
        room.players.push({...user,seat,ready:room.host===user.id});room.players.sort((a,b)=>a.seat-b.seat);commit(room);
      }
      json(res,200,publicRoom(room,user));return;
    }
    if(operation==='events'&&req.method==='GET'){
      const room=loadRoom(code);requireMember(room,user);
      const set=streams.get(code)||new Set();
      if([...set].filter(s=>s.user.id===user.id).length>=8)error('Слишком много открытых вкладок',429);
      res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
      res.write('retry: 2000\n\n');const stream={user,res};set.add(stream);streams.set(code,set);broadcast(room);
      const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),20000);
      res.on('close',()=>{clearInterval(heartbeat);set.delete(stream);if(!set.size)streams.delete(code);try{broadcast(loadRoom(code))}catch{}});return;
    }
    if(!operation&&req.method==='GET'){const room=loadRoom(code);requireMember(room,user);json(res,200,publicRoom(room,user));return}
    if(req.method!=='POST')error('Метод не поддерживается',405);
    const data=await bodyOf(req);
    // Load AFTER the last await: mutations are serialized in the Node event loop.
    const room=loadRoom(code);requireMember(room,user);
    const seat=seatOf(room,user);
    if(operation==='message'){
      messages.send(room,seat.seat,data.text,data.capital);
      broadcast(room);json(res,200,publicRoom(room,user));return;
    }
    if(data.revision!==room.revision)error('Поле уже изменилось. Повторите действие',409);
    if(operation==='ready'){if(room.status!=='lobby')error('Партия уже началась');seat.ready=!!data.ready;}
    else if(operation==='map'){
      if(user.id!==room.host||room.status!=='lobby')error('Изменить карту может создатель до начала партии',403);
      room.map=validateMap(data.map,room.capacity);room.name=room.map.name;
      for(const p of room.players)p.ready=p.id===room.host;
    }
    else if(operation==='start'){
      if(user.id!==room.host)error('Начать может только создатель комнаты',403);
      if(room.status!=='lobby')error('Партия уже началась');
      if(room.players.length!==room.capacity||!room.players.every(p=>p.ready))error('Дождитесь всех игроков и их готовности');
      room.game=createGame(room.map);room.status='playing';
    }
    else if(operation==='action'){
      if(room.status!=='playing')error('Партия не идёт');
      const previous=room.game;
      const undo=data.action?.type==='undo';
      let entry;
      if(undo){
        if(previous.turn!==seat.seat)error('Сейчас ход другого игрока',403);
        entry=lastUndo(code);if(!entry)error('Нет действий для отмены');
        room.game=restoreUndoPatch(previous,JSON.parse(entry.body));
      }else room.game=applyAction(previous,seat.seat,data.action);
      if(room.game.winner!==null)room.status='finished';
      db.exec('BEGIN IMMEDIATE');
      try{
        if(undo)db.prepare('DELETE FROM room_undo WHERE id=?').run(entry.id);
        else if(['end','surrender'].includes(data.action.type)||room.status==='finished')db.prepare('DELETE FROM room_undo WHERE room=?').run(code);
        else db.prepare('INSERT INTO room_undo(room,body) VALUES(?,?)').run(code,JSON.stringify(makeUndoPatch(previous,room.game)));
        room.revision++;saveRoom(room);db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e}
      broadcast(room);json(res,200,publicRoom(room,user));return;
    }
    else if(operation==='leave'){
      if(room.status==='playing')error('Во время партии используйте «Сдаться» в настройках');
      room.players=room.players.filter(p=>p.id!==user.id);
      if(room.host===user.id&&room.players.length){room.host=room.players[0].id;room.players[0].ready=true;}
      for(const s of streams.get(code)||[])if(s.user.id===user.id)s.res.end();
    }else error('Неизвестное действие',404);
    commit(room);json(res,200,publicRoom(room,user));
  }catch(e){if(!res.headersSent)json(res,e.status||400,{error:e.message||'Не удалось выполнить действие'});else res.end();}
});
server.requestTimeout=15000;server.headersTimeout=10000;
const cleanup=setInterval(()=>{const now=Date.now();messages.cleanup(now);for(const [ip,entry]of rate)if(now-entry.time>120000)rate.delete(ip);db.prepare('DELETE FROM sessions WHERE expires<?').run(now)},60000);cleanup.unref();
const port=Number(process.env.PORT)||3000,host=process.env.HOST||'127.0.0.1';
server.listen(port,host,()=>console.log(`Antiyoy Friends: http://${host}:${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{for(const set of streams.values())for(const s of set)s.res.end();server.close(()=>{db.close();process.exit(0)})});
