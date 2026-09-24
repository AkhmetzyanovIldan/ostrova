import { createHmac, timingSafeEqual, randomBytes, createHash } from 'node:crypto';

export const makeToken=()=>randomBytes(32).toString('base64url');
export const hashToken=token=>createHash('sha256').update(token).digest('hex');

// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function validateTelegramInitData(initData,botToken,now=Date.now()) {
  if(!botToken||typeof initData!=='string'||initData.length>16384)throw new Error('Не удалось проверить вход в Telegram');
  const params=new URLSearchParams(initData), received=params.get('hash');
  if(!received||!/^[a-f0-9]{64}$/i.test(received))throw new Error('Некорректная подпись Telegram');
  const keys=[...params.keys()];
  if(new Set(keys).size!==keys.length)throw new Error('Повторяющиеся параметры Telegram');
  params.delete('hash');
  const data=[...params.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=createHmac('sha256','WebAppData').update(botToken).digest();
  const expected=createHmac('sha256',secret).update(data).digest();
  if(!timingSafeEqual(expected,Buffer.from(received,'hex')))throw new Error('Подпись Telegram не совпадает');
  const date=Number(params.get('auth_date'));
  if(!Number.isInteger(date)||date*1000>now+60000||now-date*1000>86400000)throw new Error('Откройте приложение заново: вход Telegram устарел');
  let user;try{user=JSON.parse(params.get('user'))}catch{throw new Error('Некорректный пользователь Telegram')}
  if(!Number.isSafeInteger(user?.id)||user.id<=0||typeof user.first_name!=='string')throw new Error('Нет пользователя Telegram');
  return {id:`tg:${user.id}`,name:user.first_name.slice(0,24),telegram:true};
}
