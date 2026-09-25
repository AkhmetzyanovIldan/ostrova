import {randomUUID} from 'node:crypto';
export const MESSAGE_DURATION_MS=5000;
export class RoomMessages{
  constructor(){this.rooms=new Map();}
  active(code,now=Date.now()){
    const messages=this.rooms.get(code)||[];
    const active=messages.filter(message=>message.expiresAt>now);
    if(active.length)this.rooms.set(code,active);else this.rooms.delete(code);
    return active;
  }
  send(room,seat,text,capital,now=Date.now()){
    if(room.status!=='playing'||room.game.eliminated.includes(seat))throw new Error('Сообщения доступны участникам текущей партии');
    if(typeof text!=='string')throw new Error('Введите сообщение');
    text=text.trim().replace(/[\u0000-\u001f\u007f]/g,' ');
    if(!text||Array.from(text).length>120)throw new Error('Сообщение должно содержать от 1 до 120 символов');
    const provinces=room.game.provinces.filter(p=>p.owner===seat);
    const province=provinces.find(p=>p.capital===capital)||provinces.sort((a,b)=>b.cells.length-a.cells.length)[0];
    if(!province)throw new Error('У вас нет столицы');
    const active=this.active(room.code,now);
    if(active.some(message=>message.seat===seat))throw new Error('Следующее сообщение можно отправить через пять секунд');
    const message={id:randomUUID(),seat,capital:province.capital,text,expiresAt:now+MESSAGE_DURATION_MS};
    this.rooms.set(room.code,[...active,message]);
    return message;
  }
  cleanup(now=Date.now()){for(const code of this.rooms.keys())this.active(code,now);}
}
