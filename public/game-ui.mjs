import {income,upkeep,farmCost,provinceAt,UNIT_NAMES} from '/shared/engine.mjs';
import {hudImage,pieceIcon} from './art.mjs';
export function activeProvince(state){
  const game=state.room?.game;
  if(!game)return null;
  const province=provinceAt(game,state.selected);
  return province?.owner===state.room.me?province:null;
}
export function drawGameUi(state){
  const header=document.querySelector('#game-top'),dock=document.querySelector('#game-dock');
  if(state.screen!=='game'){header.innerHTML='';dock.innerHTML='';return;}
  const room=state.room,game=room.game,province=activeProvince(state);
  const myTurn=game.turn===room.me&&game.winner===null;
  const ready=myTurn&&state.connected&&!state.busy;
  const profit=province?income(game,province)-upkeep(game,province):null;
  header.innerHTML=`<output class="hud-treasury" aria-label="Казна">${hudImage('coin')}<span>${province?province.money:'—'}</span></output><output class="hud-profit" aria-label="Доход за следующий ход" title="Доход за вычетом содержания">${profit===null?'—':`${profit>=0?'+':''}${profit}`}</output><button class="hud-settings" data-action="game-settings" aria-label="Настройки"><span></span><span></span><span></span></button>`;
  let preview='';
  if(state.build){
    const unit=state.build.type==='recruit',type=unit?'unit':state.build.building;
    const price=unit?state.build.level*10:type==='farm'?(province?farmCost(game,province):12):type==='tower'?15:type==='fort'?35:10;
    const name=unit?UNIT_NAMES[state.build.level]:{farm:'Ферма',tower:'Башня',fort:'Крепость',tree:'Дерево'}[type];
    preview=`<div class="purchase-preview" role="status" aria-label="${name}, цена ${price}">${pieceIcon(type==='tree'?'pine':type,state.build.level)}<span>$${price}</span></div>`;
  }
  dock.innerHTML=`${preview}<div class="hud-actions"><button data-action="undo-turn" aria-label="Отменить ход" title="Отменить последнее действие" ${ready&&room.canUndo?'':'disabled'}>${hudImage('undo')}</button><button data-action="cycle-building" aria-label="Выбрать строительство" title="Ферма → башня → крепость" aria-pressed="${state.build?.type==='build'}" ${ready&&province?'':'disabled'}>${pieceIcon('farm')}</button><button data-action="cycle-unit" aria-label="Выбрать воина" title="Крестьянин → копейщик → барон → рыцарь" aria-pressed="${state.build?.type==='recruit'}" ${ready&&province?'':'disabled'}>${pieceIcon('unit',1)}</button><button data-action="${game.winner!==null?'home':'end'}" aria-label="${game.winner!==null?'Вернуться к комнатам':'Сделать ход'}" title="Завершить ход" ${game.winner!==null||ready?'':'disabled'}>${hudImage('end_turn')}</button></div>`;
}
