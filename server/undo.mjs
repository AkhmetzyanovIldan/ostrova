// Keep only changed fields and cells, rather than a full map for every action.
export function makeUndoPatch(before,after){
  const fields={},cells={};
  for(const [key,value] of Object.entries(before)){
    if(key==='cells')continue;
    if(JSON.stringify(value)!==JSON.stringify(after[key]))fields[key]=value;
  }
  for(const [id,cell] of Object.entries(before.cells)){
    if(JSON.stringify(cell)!==JSON.stringify(after.cells[id]))cells[id]=cell;
  }
  return {turn:before.turn,ply:before.ply,fields,cells};
}
export function restoreUndoPatch(game,patch){
  if(game.turn!==patch.turn||game.ply!==patch.ply)throw new Error('Можно отменять только действия текущего хода');
  return {...game,...structuredClone(patch.fields),cells:{...game.cells,...structuredClone(patch.cells)}};
}
