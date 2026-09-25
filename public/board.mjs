import {COLORS,COLOR_NAMES,key,neighbors,legalTargets,buildingTargets,provinceAt,defense} from '/shared/engine.mjs';
import {piece} from './art.mjs';
const NS='http://www.w3.org/2000/svg';
const SIZE=25;
const GAME_COLORS=['#64b655','#b9bd63','#af5146','#57b8b3','#7960af','#bf5880'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const center=c=>({x:SIZE*1.5*c.q,y:SIZE*Math.sqrt(3)*(c.r+c.q/2)});
const points=(x,y,s=SIZE)=>Array.from({length:6},(_,i)=>`${x+s*Math.cos(i*Math.PI/3)},${y+s*Math.sin(i*Math.PI/3)}`).join(' ');
export class Board {
  constructor(element,onCell,onBackground=()=>{}){
    this.element=element;this.onCell=onCell;this.zoom=matchMedia('(max-width:700px)').matches?1.3:1;this.pan={x:0,y:0};this.pointers=new Map();
    element.innerHTML='<svg class="hex-board" role="group" aria-label="Игровая карта" xmlns="http://www.w3.org/2000/svg"><g class="world"></g></svg>';
    this.svg=element.querySelector('svg');this.world=element.querySelector('.world');
    this.svg.addEventListener('click',e=>{if(this.dragged)return;const id=e.target.closest('[data-cell]')?.dataset.cell;if(id)this.onCell(id);else onBackground();});
    this.svg.addEventListener('keydown',e=>{
      const id=e.target.closest('[data-cell]')?.dataset.cell;
      if((e.key==='Enter'||e.key===' ')&&id){e.preventDefault();this.onCell(id);this.world.querySelector(`[data-cell="${id}"]`)?.focus();}
      const delta={ArrowRight:0,ArrowUp:2,ArrowLeft:3,ArrowDown:5}[e.key];
      if(delta!==undefined&&id){e.preventDefault();const[q,r]=id.split(',').map(Number),next=neighbors({q,r})[delta],node=this.world.querySelector(`[data-cell="${next}"]`);if(node){e.target.setAttribute('tabindex','-1');node.setAttribute('tabindex','0');node.focus();}}
    });
    this.svg.addEventListener('wheel',e=>{e.preventDefault();this.scale(e.deltaY<0?1.12:1/1.12)},{passive:false});
    this.svg.addEventListener('pointerdown',e=>{this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.dragged=false;this.start={x:e.clientX,y:e.clientY};if(e.pointerType!=='mouse'||e.button===1||e.target===this.svg){this.svg.setPointerCapture(e.pointerId);this.panning=true;}if(this.pointers.size===2){const[a,b]=[...this.pointers.values()];this.pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
    this.svg.addEventListener('pointermove',e=>{
      const old=this.pointers.get(e.pointerId);if(!old)return;
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pointers.size===2){const[a,b]=[...this.pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(this.pinch)this.scale(d/this.pinch);this.pinch=d;this.dragged=true;return;}
      if(Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)>6){this.dragged=true;this.panning=true;}
      if(this.panning&&this.dragged){const rect=this.svg.getBoundingClientRect(),factor=Math.max(this.bounds.w/rect.width,this.bounds.h/rect.height);this.pan.x+=(e.clientX-old.x)*factor/this.zoom;this.pan.y+=(e.clientY-old.y)*factor/this.zoom;this.transform();}
    });
    const up=e=>{this.pointers.delete(e.pointerId);this.panning=false;this.pinch=null;if(this.svg.hasPointerCapture(e.pointerId))this.svg.releasePointerCapture(e.pointerId);if(!this.dragged&&e.pointerType!=='mouse'){const t=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cell]');if(t){this.onCell(t.dataset.cell);this.dragged=true;}}};
    this.svg.addEventListener('pointerup',up);this.svg.addEventListener('pointercancel',up);
  }
  scale(factor){this.zoom=Math.max(.65,Math.min(3.5,this.zoom*factor));this.transform();}
  reset(game=this.game){this.zoom=game?1:matchMedia('(max-width:700px)').matches?1.3:1;this.pan={x:0,y:0};this.transform();}
  transform(){this.world.setAttribute('transform',`scale(${this.zoom}) translate(${this.pan.x} ${this.pan.y})`);}
  draw(map,{editing=false,selected=null,game=null,selection=null,build=null,showDefense=false,messages=[],serverOffset=0}={}){
    this.game=!!game;
    const cells=game?.cells||map.cells,all=Object.values(cells),positions=all.map(center);
    const margin=editing?60:30,x=Math.min(...positions.map(p=>p.x))-margin,y=Math.min(...positions.map(p=>p.y))-margin;
    this.bounds={x,y,w:Math.max(...positions.map(p=>p.x))-x+margin,h:Math.max(...positions.map(p=>p.y))-y+margin};
    const b=this.bounds;this.svg.setAttribute('viewBox',`${b.x} ${b.y} ${b.w} ${b.h}`);
    let tiles=Object.entries(cells);
    if(editing){const water=new Set();for(const c of all)for(const n of neighbors(c))if(!cells[n])water.add(n);for(const id of water){const[q,r]=id.split(',').map(Number);if(Math.abs(q)<=25&&Math.abs(r)<=25)tiles.push([id,{q,r,water:true,owner:-1}]);}}
    const targets=new Set(game&&build?.type==='build'?buildingTargets(game,selected,build.building):game&&selection?legalTargets(game,selection,build?.level):[]);
    if(selection&&!build)targets.add(selection);
    const province=game&&selected?provinceAt(game,selected):null;
    const picking=game&&!!(build||selection);
    let html='';
    for(const[id,c]of tiles){
      const {x,y}=center(c),fill=game?(c.owner>=0?GAME_COLORS[c.owner]:'#616161'):(c.owner>=0?COLORS[c.owner]:'#c4ce99');
      if(c.water){html+=`<polygon data-cell="${id}" points="${points(x,y,24)}" class="water-cell" role="button" tabindex="-1" aria-label="Добавить сушу ${id}"/>`;continue;}
      const shade=((c.q*17+c.r*7)%5)*0.007;
      html+=`<g data-cell="${id}" role="button" tabindex="${id===selected?'0':'-1'}" aria-label="Клетка ${id}, ${c.owner<0?'нейтральная':COLOR_NAMES[c.owner]}${c.building?', '+({capital:'столица',farm:'ферма',tower:'башня',fort:'крепость'}[c.building]):''}${c.unit?', отряд '+c.unit.level:''}" class="hex ${targets.has(id)?'reachable':''} ${selected===id?'selected':''}"><polygon class="tile" points="${points(x,y)}" fill="${fill}"/><polygon points="${points(x,y)}" fill="${shade<0?'black':'white'}" opacity="${Math.abs(shade)}" pointer-events="none"/>`;
      if(c.building||c.tree||c.grave||c.unit){const type=c.unit?'unit':c.building||c.tree||'grave';html+=`<g transform="translate(${x},${y+2}) scale(.89)" class="${c.unit&&!c.unit.moved&&game?.turn===c.owner?'ready-unit':''} ${c.unit?.moved?'spent-unit':''}">${piece(type,c.unit?.level)}</g>`;}
      if(showDefense&&game&&defense(game,id))html+=`<g><circle cx="${x+13}" cy="${y-10}" r="7" fill="#27493c"/><text x="${x+13}" y="${y-7.5}" text-anchor="middle" fill="white" font-size="8">${defense(game,id)}</text></g>`;
      if(selected===id&&!game)html+=`<polygon class="selection-ring" points="${points(x,y,23)}"/>`;
      if(picking&&!targets.has(id))html+=`<polygon points="${points(x,y)}" fill="#000" opacity=".35" pointer-events="none"/>`;
      html+='</g>';
    }
    // Continuous coast lines and province borders preserve the original game's visual language.
    for(const c of all){const {x,y}=center(c);for(let i=0;i<6;i++){
      const n=cells[neighbors(c)[i]];
      const edges=[[0,1],[5,0],[4,5],[3,4],[2,3],[1,2]],pair=edges[i];
      const[a1,a2]=pair.map(v=>v*Math.PI/3),d=`M${x+SIZE*Math.cos(a1)} ${y+SIZE*Math.sin(a1)}L${x+SIZE*Math.cos(a2)} ${y+SIZE*Math.sin(a2)}`;
      if(!n||n.owner!==c.owner)html+=`<path d="${d}" stroke="${game?'#141414':!n?'#274e49':'#486344'}" stroke-width="${!n?1.8:1.3}" opacity="${game?1:!n?.85:.55}" pointer-events="none"/>`;
      const id=key(c.q,c.r),nextId=neighbors(c)[i];
      if(game&&!picking&&province?.cells.includes(id)&&!province.cells.includes(nextId))html+=`<path d="${d}" class="province-border"/>`;
      if(picking&&targets.has(id)&&!targets.has(nextId))html+=`<path d="${d}" class="target-border"/>`;
    }}
    this.world.innerHTML=html;
    clearTimeout(this.messageTimer);
    const now=Date.now(),active=messages.filter(m=>m.expiresAt+serverOffset>now&&cells[m.capital]);
    for(const m of active){
      const{x,y}=center(cells[m.capital]);
      this.world.insertAdjacentHTML('beforeend',`<g class="speech-bubble" data-message-id="${esc(m.id)}" role="status" aria-label="Сообщение игрока"><path class="speech-arrow" d="M${x-5} ${y-33}L${x} ${y-24}L${x+5} ${y-33}Z"/><foreignObject x="${x-75}" y="${y-102}" width="150" height="72"><div xmlns="http://www.w3.org/1999/xhtml" style="height:72px;display:flex;align-items:end;justify-content:center"><div class="speech-content">${esc(m.text)}</div></div></foreignObject></g>`);
    }
    const expire=()=>{let next=Infinity;for(const m of active){const left=m.expiresAt+serverOffset-Date.now();if(left<=0)this.world.querySelector(`[data-message-id="${m.id}"]`)?.remove();else next=Math.min(next,left);}if(Number.isFinite(next))this.messageTimer=setTimeout(expire,next+1);};
    expire();
    if(!this.world.querySelector('[tabindex="0"]'))this.world.querySelector('[data-cell]')?.setAttribute('tabindex','0');
    this.transform();
  }
}
