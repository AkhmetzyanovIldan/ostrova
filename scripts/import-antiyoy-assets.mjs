// Copies unmodified, non-commercial upstream sprites used by the game UI.
import {copyFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
const source=path.resolve('reference-antiyoy/classic/assets');
const destination=path.resolve('public/assets/antiyoy');
mkdirSync(destination,{recursive:true});
const files=['coin.png','undo.png','end_turn.png',
  ...['castle','house','tower','strong_tower','pine','palm','grave','man0','man1','man2','man3'].map(name=>`field_elements/${name}.png`)];
for(const file of files)copyFileSync(path.join(source,file),path.join(destination,path.basename(file)));
console.log(`Copied ${files.length} original assets. Attribution: NOTICE.md`);
