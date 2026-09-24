import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
for(const folder of ['public','server','shared','scripts','tests'])for(const file of readdirSync(folder))if(file.endsWith('.mjs')){
  const result=spawnSync(process.execPath,['--check',`${folder}/${file}`],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
console.log('All JavaScript modules parse successfully.');
