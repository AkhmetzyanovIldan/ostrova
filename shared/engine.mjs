// A deterministic, transport-independent rules engine. All moves are validated here.
export const COLORS = ['#75bd73', '#e3bd5e', '#cf7773', '#76afd0', '#b38ac7', '#e0955e'];
export const COLOR_NAMES = ['Зелёные', 'Жёлтые', 'Красные', 'Голубые', 'Фиолетовые', 'Оранжевые'];
export const UPKEEP = [0, 2, 6, 18, 36];
export const DIRECTIONS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
export const UNIT_NAMES = ['', 'Крестьянин', 'Копейщик', 'Барон', 'Рыцарь'];
export const key = (q,r) => `${q},${r}`;
export const neighbors = cell => DIRECTIONS.map(([q,r])=>key(cell.q+q,cell.r+r));
export const distance = (a,b) => (Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
const requireRule = (condition,message) => { if (!condition) throw new Error(message); };
export function random(state) {
  let x = state.rng | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.rng = x >>> 0;
  return (x >>> 0) / 4294967296;
}
export function groups(cells, owner) {
  const todo = new Set(Object.keys(cells).filter(id=>cells[id].owner===owner));
  const result = [];
  while (todo.size) {
    const stack = [todo.values().next().value], group=[];
    todo.delete(stack[0]);
    while(stack.length) {
      const id=stack.pop(); group.push(id);
      for(const n of neighbors(cells[id])) if(todo.delete(n)) stack.push(n);
    }
    result.push(group.sort());
  }
  return result;
}
export function provinceAt(state,id) { return state.provinces.find(p=>p.cells.includes(id)); }
export function income(state,province) {
  return province.cells.reduce((sum,id)=>sum+(state.cells[id].tree ? 0 : 1)+(state.cells[id].building==='farm'?4:0),0);
}
export function upkeep(state,province) {
  return province.cells.reduce((sum,id)=>sum+UPKEEP[state.cells[id].unit?.level||0]+(state.cells[id].building==='fort'?6:state.cells[id].building==='tower'?1:0),0);
}
export function farmCost(state,province) { return 12+2*province.cells.filter(id=>state.cells[id].building==='farm').length; }
export function defense(state,id) {
  const cell=state.cells[id]; if(!cell||cell.owner<0) return 0;
  let value=0;
  for(const n of [id,...neighbors(cell)]) {
    const c=state.cells[n]; if(!c||c.owner!==cell.owner) continue;
    value=Math.max(value,c.unit?.level||0,c.building==='capital'?1:c.building==='tower'?2:c.building==='fort'?3:0);
  }
  return value;
}
export function rebuildProvinces(state) {
  const old=state.provinces||[], next=[];
  for(let owner=0;owner<state.playerCount;owner++) {
    for(const ids of groups(state.cells,owner)) {
      if(ids.length<2) {
        const isolated=state.cells[ids[0]];
        if(isolated.building==='capital') isolated.tree=neighbors(isolated).some(n=>!state.cells[n])?'palm':'pine';
        isolated.building=null;
        continue;
      }
      const capitals=ids.filter(id=>state.cells[id].building==='capital');
      const previous=old.filter(p=>capitals.includes(p.capital));
      let capital=previous.sort((a,b)=>b.cells.length-a.cells.length)[0]?.capital || capitals[0];
      if(!capital) {
        const ranked=ids.slice().sort((a,b)=>{
          const cost=id=> (state.cells[id].unit?100:0)+(state.cells[id].building?50:0)+(state.cells[id].tree||state.cells[id].grave?10:0)-neighbors(state.cells[id]).filter(n=>ids.includes(n)).length;
          return cost(a)-cost(b)||a.localeCompare(b);
        });
        capital=ranked[0];
      }
      for(const id of capitals) if(id!==capital) state.cells[id].building=null;
      const c=state.cells[capital]; c.building='capital'; c.tree=null; c.grave=false; c.unit=null;
      next.push({id:capital,capital,owner,cells:ids,money:0});
    }
  }
  // Each old treasury follows its largest surviving component; merging sums treasuries.
  for(const p of old) {
    const survivors=next.filter(n=>n.owner===p.owner&&n.cells.some(id=>p.cells.includes(id)));
    survivors.sort((a,b)=>b.cells.filter(id=>p.cells.includes(id)).length-a.cells.filter(id=>p.cells.includes(id)).length||a.capital.localeCompare(b.capital));
    if(survivors[0])survivors[0].money+=p.money;
  }
  state.provinces=next;
}
export function generateMap({radius=6,players=2,seed=Date.now(),shape='continent',trees=true}={}) {
  radius=Math.max(4,Math.min(10,Number(radius)||6));
  players=Math.max(2,Math.min(6,Number(players)||2));
  const state={rng:(Number(seed)>>>0)||1};
  const cells={};
  for(let q=-radius;q<=radius;q++) for(let r=-radius;r<=radius;r++) {
    if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))>radius) continue;
    const edge=Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))===radius;
    if(edge&&random(state)<0.25) continue;
    if(shape==='straits'&&Math.abs(q)===1&&Math.abs(r)>2&&random(state)<0.62) continue;
    cells[key(q,r)]={q,r,owner:-1,building:null,tree:null,unit:null,grave:false};
  }
  // Starting provinces are rotationally distributed, with the same seven cells each.
  const ring=Math.max(players>=5?3:2,radius-2);
  const spots=[];
  for(let p=0;p<players;p++) {
    const angle=(Math.PI*2*p/players)-Math.PI/2;
    const q=Math.round(Math.cos(angle)*ring);
    const r=Math.round(Math.sin(angle)*ring-Math.cos(angle)*ring/2);
    spots.push({q,r});
  }
  for(let p=0;p<players;p++) {
    const spot=spots[p];
    for(const id of [key(spot.q,spot.r),...neighbors(spot)]) {
      const [q,r]=id.split(',').map(Number);
      cells[id] ||= {q,r,owner:-1,building:null,tree:null,unit:null,grave:false};
      cells[id].owner=p; cells[id].tree=null;
    }
    cells[key(spot.q,spot.r)].building='capital';
  }
  if(trees) for(const c of Object.values(cells)) if(c.owner===-1&&random(state)<0.16) {
    c.tree=neighbors(c).some(n=>!cells[n])?'palm':'pine';
  }
  return {version:1,name:'Новая земля',playerCount:players,radius,cells,startingMoney:10,seed:state.rng};
}
export function validateMap(input,playerCount=input?.playerCount) {
  requireRule(input&&typeof input==='object'&&input.cells&&typeof input.cells==='object','Некорректный файл карты');
  requireRule(Number.isInteger(playerCount)&&playerCount>=2&&playerCount<=6,'Нужно от 2 до 6 игроков');
  const entries=Object.entries(input.cells);
  requireRule(entries.length>=14&&entries.length<=1000,'На карте должно быть от 14 до 1000 клеток');
  const cells={};
  for(const [id,raw] of entries) {
    requireRule(raw&&Number.isInteger(raw.q)&&Number.isInteger(raw.r)&&Math.abs(raw.q)<=25&&Math.abs(raw.r)<=25&&id===key(raw.q,raw.r),'Некорректные координаты клетки');
    requireRule(Number.isInteger(raw.owner)&&raw.owner>=-1&&raw.owner<playerCount,'Карта содержит лишний цвет игрока');
    requireRule([null,undefined,'capital','farm','tower','fort'].includes(raw.building),'Неизвестное здание');
    requireRule([null,undefined,'pine','palm'].includes(raw.tree),'Неизвестное дерево');
    const unit=raw.unit?{level:raw.unit.level,moved:false}:null;
    requireRule(!unit||(Number.isInteger(unit.level)&&unit.level>=1&&unit.level<=4),'Некорректная сила отряда');
    requireRule([!!unit,!!raw.building,!!raw.tree,!!raw.grave].filter(Boolean).length<=1,'На клетке может находиться только один объект');
    requireRule(raw.owner>=0||(!unit&&!raw.building),'Войска и здания должны принадлежать игроку');
    cells[id]={q:raw.q,r:raw.r,owner:raw.owner,building:raw.building||null,tree:raw.tree||null,unit,grave:!!raw.grave};
  }
  for(let p=0;p<playerCount;p++) requireRule(groups(cells,p).some(g=>g.length>=2),`Игроку «${COLOR_NAMES[p]}» нужна провинция хотя бы из двух клеток`);
  const all=Object.keys(cells), seen=new Set([all[0]]), queue=[all[0]];
  for(let i=0;i<queue.length;i++) for(const n of neighbors(cells[queue[i]])) if(cells[n]&&!seen.has(n)){seen.add(n);queue.push(n)}
  requireRule(seen.size===all.length,'Соедините все острова сушей: в классических правилах нет кораблей');
  const startingMoney=input.startingMoney===undefined?10:Number(input.startingMoney);
  requireRule(Number.isInteger(startingMoney)&&startingMoney>=0&&startingMoney<=100,'Начальная казна должна быть целым числом от 0 до 100');
  return {version:1,name:String(input.name||'Новая земля').slice(0,40),playerCount,radius:Math.max(4,Math.min(25,Number(input.radius)||6)),startingMoney,seed:(Number(input.seed)>>>0)||1,cells};
}
export function createGame(map) {
  map=validateMap(map);
  const state={version:1,cells:structuredClone(map.cells),playerCount:map.playerCount,provinces:[],turn:0,round:1,ply:0,rng:map.seed||1,winner:null,eliminated:[],log:[],mapName:map.name};
  rebuildProvinces(state);
  for(const p of state.provinces) p.money=map.startingMoney;
  return state;
}
function addLog(state,text) { state.log.push({ply:state.ply,round:state.round,player:state.turn,text}); state.log=state.log.slice(-60); }
function ownProvince(state,owner,id) {
  const p=provinceAt(state,id);
  requireRule(p&&p.owner===owner,'Выберите свою провинцию'); return p;
}
export function movementZone(state,from) {
  const source=state.cells[from];if(!source)return new Set();
  const result=new Set([from]),queue=[[from,0]];
  for(let i=0;i<queue.length;i++){
    const[id,depth]=queue[i];if(depth>=4||state.cells[id].owner!==source.owner)continue;
    for(const next of neighbors(state.cells[id]))if(state.cells[next]&&!result.has(next)){result.add(next);queue.push([next,depth+1]);}
  }
  return result;
}
function reachable(state,province,target) {return province.cells.includes(target)||neighbors(state.cells[target]).some(id=>province.cells.includes(id));}
function canLand(state,province,target,level,from=null) {
  const c=state.cells[target]; requireRule(c,'На воду ходить нельзя');
  requireRule(reachable(state,province,target),'Клетка должна граничить с выбранной провинцией');
  if(from)requireRule(movementZone(state,from).has(target),'Отряд может пройти не больше четырёх клеток за ход');
  if(c.owner!==province.owner) {
    requireRule(level===4||level>defense(state,target),'Защита слишком сильна: нужен отряд сильнее защитника');
  } else {
    requireRule(!c.building,'Клетка занята зданием');
    if(c.unit) requireRule(target!==from&&c.unit.level+level<=4,'Суммарная сила отряда не может превышать 4');
  }
}
function land(state,target,owner,level,moved) {
  const c=state.cells[target], capture=c.owner!==owner;
  if(!capture&&c.unit) {c.unit={level:c.unit.level+level,moved:moved||c.unit.moved};return;}
  const clearing=!!c.tree||!!c.grave;
  if(c.tree&&!capture){const p=provinceAt(state,target);if(p)p.money+=3;}
  c.owner=owner;c.building=null;c.tree=null;c.grave=false;c.unit={level,moved:moved||clearing||capture};
}
export function legalTargets(state,from,levelOverride) {
  const p=provinceAt(state,from), c=state.cells[from]; if(!p||p.owner!==state.turn) return [];
  const level=levelOverride||c?.unit?.level; if(!level||(!levelOverride&&c.unit.moved))return [];
  return Object.keys(state.cells).filter(id=>{try{canLand(state,p,id,level,levelOverride?null:from);return id!==from||!!levelOverride}catch{return false}});
}
function growTrees(state) {
  const old=structuredClone(state.cells), candidates=[];
  for(const [id,c] of Object.entries(old)) {
    if(c.unit||c.building||c.tree||c.grave)continue;
    const ns=neighbors(c).map(n=>old[n]);
    const coast=ns.some(n=>!n);
    if(coast&&ns.some(n=>n?.tree==='palm'&&!n.treeBlocked)&&random(state)<0.3)candidates.push([id,'palm']);
    else if(ns.filter(n=>n?.tree).length>=2&&ns.some(n=>n?.tree==='pine'&&!n.treeBlocked)&&random(state)<0.2)candidates.push([id,'pine']);
  }
  for(const [id,tree] of candidates)state.cells[id].tree=tree;
  for(const c of Object.values(state.cells))c.treeBlocked=false;
}
function beginTurn(state) {
  for(const c of Object.values(state.cells)) if(c.owner===state.turn) {
    if(c.grave) {c.grave=false;c.tree=neighbors(c).some(id=>!state.cells[id])?'palm':'pine';c.treeBlocked=true;}
    if(c.unit)c.unit.moved=false;
  }
  for(const p of state.provinces.filter(p=>p.owner===state.turn)) {
    const balance=p.money+(state.round===1?0:income(state,p)-upkeep(state,p));
    if(balance<0) {
      p.money=0;
      for(const id of p.cells) if(state.cells[id].unit){state.cells[id].unit=null;state.cells[id].grave=true;}
      addLog(state,`${COLOR_NAMES[state.turn]}: войска провинции погибли от нехватки золота`);
    } else p.money=balance;
  }
  for(const [id,c] of Object.entries(state.cells))if(c.owner===state.turn&&c.unit&&!provinceAt(state,id)){c.unit=null;c.grave=true;}
}
function updateWinner(state) {
  const living=[];
  for(let p=0;p<state.playerCount;p++) {
    if(state.provinces.some(province=>province.owner===p)&&!state.eliminated.includes(p))living.push(p);
    else if(!state.eliminated.includes(p))state.eliminated.push(p);
  }
  if(living.length<=1)state.winner=living[0]??-1;
}
function advanceTurn(state) {
  if(state.winner!==null)return;
  const previous=state.turn;
  do {state.turn=(state.turn+1)%state.playerCount;} while(state.eliminated.includes(state.turn));
  state.ply++;
  if(state.turn<=previous) {state.round++;growTrees(state);}
  beginTurn(state);
}
export function applyAction(input,owner,action) {
  requireRule(input.winner===null,'Партия уже завершена');
  requireRule(owner===input.turn,'Сейчас ход другого игрока');
  requireRule(action&&typeof action==='object','Некорректный ход');
  const state=structuredClone(input), {type,to,from}=action;
  if(type==='end') {
    addLog(state,`${COLOR_NAMES[owner]} завершили ход`); advanceTurn(state); return state;
  }
  if(type==='surrender') {
    state.eliminated.push(owner);
    for(const c of Object.values(state.cells))if(c.owner===owner){c.owner=-1;c.unit=null;c.building=null;}
    rebuildProvinces(state);addLog(state,`${COLOR_NAMES[owner]} сдались`);updateWinner(state);advanceTurn(state);return state;
  }
  if(type==='move') {
    const c=state.cells[from]; requireRule(c?.owner===owner&&c.unit,'Выберите свой отряд');
    requireRule(!c.unit.moved,'Этот отряд уже ходил');requireRule(from!==to,'Выберите другую клетку');
    const p=ownProvince(state,owner,from), level=c.unit.level;
    canLand(state,p,to,level,from);
    const merging=state.cells[to].owner===owner&&!!state.cells[to].unit;
    c.unit=null;land(state,to,owner,level,!merging);
    addLog(state,`${UNIT_NAMES[level]}: ${from} → ${to}`);
  } else if(type==='recruit') {
    const level=Number(action.level),p=ownProvince(state,owner,action.province);
    requireRule(Number.isInteger(level)&&level>=1&&level<=4,'Неизвестный отряд');
    requireRule(p.money>=10*level,'В казне провинции недостаточно золота');
    canLand(state,p,to,level);p.money-=10*level;land(state,to,owner,level,false);
    addLog(state,`Нанят ${UNIT_NAMES[level].toLowerCase()}`);
  } else if(type==='build') {
    const p=ownProvince(state,owner,action.province),c=state.cells[to],building=action.building;
    requireRule(c&&p.cells.includes(to),'Строить можно только в своей провинции');
    requireRule(['farm','tower','fort','tree'].includes(building),'Неизвестное здание');
    requireRule(!c.unit&&!c.tree&&(!c.building||(building==='fort'&&c.building==='tower'))&&(building!=='tree'||!c.grave),'Сначала освободите клетку');
    if(building==='farm')requireRule(neighbors(c).some(id=>p.cells.includes(id)&&['capital','farm'].includes(state.cells[id].building)),'Ферма должна соседствовать со столицей или другой фермой');
    const price=building==='farm'?farmCost(state,p):building==='tower'?15:building==='tree'?10:35;
    requireRule(p.money>=price,'В казне провинции недостаточно золота');
    p.money-=price;c.grave=false;
    if(building==='tree')c.tree=neighbors(c).some(id=>!state.cells[id])?'palm':'pine';else c.building=building;
    addLog(state,building==='tree'?'Посажено дерево':`Построена ${building==='farm'?'ферма':building==='tower'?'башня':'крепость'}`);
  } else throw new Error('Неизвестное действие');
  rebuildProvinces(state);updateWinner(state);return state;
}
