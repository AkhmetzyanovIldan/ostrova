import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validateTelegramInitData} from '../server/auth.mjs';
const token='test-bot-secret';
function signed(values){const params=new URLSearchParams(values);const check=[...params.entries()].sort().map(([k,v])=>`${k}=${v}`).join('\n');const secret=createHmac('sha256','WebAppData').update(token).digest();params.set('hash',createHmac('sha256',secret).update(check).digest('hex'));return params.toString()}
const values=()=>({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:12345,first_name:'Игрок'}),query_id:'test-query'});
test('valid Telegram HMAC is accepted',()=>{assert.equal(validateTelegramInitData(signed(values()),token).id,'tg:12345')});
test('spoofed Telegram identity and wrong bot token are rejected',()=>{const data=signed(values());assert.throws(()=>validateTelegramInitData(data.replace('12345','99999'),token));assert.throws(()=>validateTelegramInitData(data,'wrong'))});
test('expired, future, missing and duplicate Telegram data are rejected',()=>{assert.throws(()=>validateTelegramInitData(signed({...values(),auth_date:'1000'}),token));assert.throws(()=>validateTelegramInitData(signed({...values(),auth_date:String(Math.floor(Date.now()/1000)+120)}),token));assert.throws(()=>validateTelegramInitData('user={}',token));assert.throws(()=>validateTelegramInitData(signed(values())+'&user=other',token))});
