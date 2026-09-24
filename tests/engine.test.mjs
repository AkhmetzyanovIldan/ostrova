import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMap,validateMap,createGame,applyAction,UPKEEP,provinceAt,defense,income,upkeep,farmCost,neighbors,legalTargets,rebuildProvinces} from '../shared/engine.mjs';
const fresh=()=>createGame(generateMap({seed:12,players:2,radius:6,trees:false}));
const free=(s,p)=>p.cells.find(id=>!s.cells[id].building&&!s.cells[id].unit);
test('classic Antiyoy taxes differ from Slay',()=>assert.deepEqual(UPKEEP,[0,2,6,18,36]));
test('all generated sizes and player counts produce playable maps',()=>{
  for(let players=2;players<=6;players++)for(const radius of [4,6,9])for(const shape of ['continent','straits'])for(let seed=1;seed<=20;seed++){
    const map=generateMap({players,radius,shape,seed});validateMap(map);const game=createGame(map);
    assert.equal(game.provinces.filter(p=>p.cells.length>=2).length,players,`${players}/${radius}/${shape}/${seed}`);
    for(const p of game.provinces)assert.equal(p.cells.length,7,`balanced start ${players}/${radius}/${seed}`);
  }
});
test('zero starting gold survives map validation',()=>{const m=generateMap();m.startingMoney=0;assert.equal(createGame(m).provinces[0].money,0)});
test('wrong player cannot move and invalid actions leave state unchanged',()=>{const s=fresh(),copy=structuredClone(s);assert.throws(()=>applyAction(s,1,{type:'end'}),/другого/);assert.deepEqual(s,copy)});
test('a recruited friendly unit can move once, with server-side reach checking',()=>{
  let s=fresh(),p=s.provinces[0],to=free(s,p);s=applyAction(s,0,{type:'recruit',level:1,province:p.capital,to});assert.equal(s.cells[to].unit.moved,false);assert.equal(provinceAt(s,to).money,0);
  const target=legalTargets(s,to).find(id=>s.cells[id].owner===-1);assert.ok(target);s=applyAction(s,0,{type:'move',from:to,to:target});assert.equal(s.cells[target].owner,0);assert.equal(s.cells[target].unit.moved,true);assert.throws(()=>applyAction(s,0,{type:'move',from:target,to}),/уже/);
});
test('direct recruitment onto frontier consumes movement',()=>{let s=fresh(),p=s.provinces[0];const to=neighbors(s.cells[free(s,p)]).find(id=>s.cells[id]?.owner===-1);s=applyAction(s,0,{type:'recruit',level:1,province:p.capital,to});assert.equal(s.cells[to].unit.moved,true)});
test('unreachable recruitment, overspending and invalid levels are rejected',()=>{const s=fresh(),p=s.provinces[0];assert.throws(()=>applyAction(s,0,{type:'recruit',level:1,province:p.capital,to:s.provinces[1].capital}));assert.throws(()=>applyAction(s,0,{type:'recruit',level:2,province:p.capital,to:free(s,p)}),/золота/);assert.throws(()=>applyAction(s,0,{type:'recruit',level:NaN,province:p.capital,to:free(s,p)}))});
test('neighboring defenders protect only their own color',()=>{const s=fresh(),p=s.provinces[0],to=free(s,p);s.cells[to].unit={level:3,moved:false};assert.equal(defense(s,to),3);assert.equal(defense(s,p.capital),3);const neutral=neighbors(s.cells[to]).find(id=>s.cells[id]?.owner===-1);assert.equal(defense(s,neutral),0)});
test('knight can attack another knight in classic rules',()=>{let s=fresh(),p=s.provinces[0],to=free(s,p);s.cells[to].unit={level:4,moved:false};const target=neighbors(s.cells[to]).find(id=>s.cells[id]?.owner===-1);s.cells[target].owner=1;s.cells[target].unit={level:4,moved:false};s=applyAction(s,0,{type:'move',from:to,to:target});assert.equal(s.cells[target].owner,0)});
test('merging two ready units preserves readiness',()=>{let s=fresh(),p=s.provinces[0],ids=p.cells.filter(id=>!s.cells[id].building);s.cells[ids[0]].unit={level:1,moved:false};s.cells[ids[1]].unit={level:1,moved:false};s=applyAction(s,0,{type:'move',from:ids[0],to:ids[1]});assert.deepEqual(s.cells[ids[1]].unit,{level:2,moved:false})});
test('merging into a spent unit cannot restore its move',()=>{let s=fresh(),p=s.provinces[0],ids=p.cells.filter(id=>!s.cells[id].building);s.cells[ids[0]].unit={level:1,moved:false};s.cells[ids[1]].unit={level:2,moved:true};s=applyAction(s,0,{type:'move',from:ids[0],to:ids[1]});assert.deepEqual(s.cells[ids[1]].unit,{level:3,moved:true})});
test('clearing a friendly tree awards three gold, spends the move',()=>{let s=fresh(),p=s.provinces[0],to=free(s,p);s.cells[to].tree='pine';s=applyAction(s,0,{type:'recruit',province:p.capital,to,level:1});assert.equal(s.provinces[0].money,3);assert.equal(s.cells[to].tree,null);assert.equal(s.cells[to].unit.moved,true)});
test('farm adjacency, price escalation and income',()=>{let s=fresh(),p=s.provinces[0];p.money=100;const to=free(s,p);s=applyAction(s,0,{type:'build',building:'farm',province:p.capital,to});p=provinceAt(s,to);assert.equal(p.money,88);assert.equal(farmCost(s,p),14);assert.equal(income(s,p),11)});
test('towers have the correct maintenance costs',()=>{const s=fresh(),p=s.provinces[0],ids=p.cells.filter(id=>!s.cells[id].building);s.cells[ids[0]].building='tower';s.cells[ids[1]].building='fort';assert.equal(upkeep(s,p),7)});
test('players begin with equal gold despite going second',()=>{let s=fresh();s=applyAction(s,0,{type:'end'});assert.equal(s.provinces.find(p=>p.owner===1).money,10);s=applyAction(s,1,{type:'end'});assert.equal(s.round,2);assert.equal(s.provinces.find(p=>p.owner===0).money,17)});
test('bankruptcy kills all troops; graves turn into trees one own turn later',()=>{let s=fresh(),p=s.provinces[0],to=free(s,p);p.money=0;s.cells[to].unit={level:4,moved:false};s=applyAction(s,0,{type:'end'});s=applyAction(s,1,{type:'end'});assert.equal(s.cells[to].unit,null);assert.equal(s.cells[to].grave,true);assert.equal(provinceAt(s,to).money,0);s=applyAction(s,0,{type:'end'});s=applyAction(s,1,{type:'end'});assert.equal(s.cells[to].grave,false);assert.ok(s.cells[to].tree)});
test('splitting a province gives the treasury to the largest remnant',()=>{
  const s=fresh();for(const c of Object.values(s.cells))if(c.owner===0){c.owner=-1;c.building=null;}
  for(let q=-4;q<=3;q++){const id=`${q},0`;s.cells[id].owner=0;s.cells[id].building=null;}
  s.provinces=s.provinces.filter(p=>p.owner!==0);rebuildProvinces(s);let p=s.provinces.find(p=>p.owner===0);p.money=73;s.cells['-2,0'].owner=1;rebuildProvinces(s);const parts=s.provinces.filter(p=>p.owner===0).sort((a,b)=>b.cells.length-a.cells.length);assert.deepEqual(parts.map(p=>p.money),[73,0]);
});
test('surrender concludes a duel and finished games reject further moves',()=>{const s=applyAction(fresh(),0,{type:'surrender'});assert.equal(s.winner,1);assert.throws(()=>applyAction(s,1,{type:'end'}),/завершена/)});
test('malformed and disconnected maps are rejected',()=>{const m=generateMap();m.cells['25,25']={q:25,r:25,owner:-1};assert.throws(()=>validateMap(m),/Соедините/);m.cells['25,25'].q=2;assert.throws(()=>validateMap(m),/координаты/)});
test('unit travel is capped at four steps, recruitment is province-wide',()=>{
  let s=fresh();for(const c of Object.values(s.cells))if(c.owner===0){c.owner=-1;c.building=null;}
  for(let q=-5;q<=5;q++){s.cells[`${q},0`].owner=0;s.cells[`${q},0`].tree=null;}
  s.cells['-5,0'].building='capital';rebuildProvinces(s);s.cells['-4,0'].unit={level:1,moved:false};
  assert.ok(legalTargets(s,'-4,0').includes('0,0'));assert.ok(!legalTargets(s,'-4,0').includes('1,0'));
  assert.throws(()=>applyAction(s,0,{type:'move',from:'-4,0',to:'1,0'}),/четырёх/);
  const p=provinceAt(s,'-4,0');p.money=20;s=applyAction(s,0,{type:'recruit',province:p.capital,to:'5,0',level:1});assert.equal(s.cells['5,0'].unit.level,1);
});
test('strong tower replacement costs the full 35; graves can be built over',()=>{
  let s=fresh(),p=s.provinces[0],to=free(s,p);p.money=60;s.cells[to].building='tower';
  s=applyAction(s,0,{type:'build',province:p.capital,to,building:'fort'});assert.equal(provinceAt(s,to).money,25);assert.equal(s.cells[to].building,'fort');
  const empty=free(s,provinceAt(s,to));s.cells[empty].grave=true;s=applyAction(s,0,{type:'build',province:p.capital,to:empty,building:'tower'});assert.equal(s.cells[empty].grave,false);
});
