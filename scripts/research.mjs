import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts/research', {recursive:true});
for (const [name, url] of [
  ['readme','https://raw.githubusercontent.com/yioTro/Antiyoy/master/README.md'],
  ['repo','https://api.github.com/repos/yioTro/Antiyoy'],
  ['telegram','https://core.telegram.org/bots/webapps'],
]) {
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(18000)});
    const body = await response.text();
    await writeFile(`artifacts/research/${name}.txt`, body);
    console.log(name, response.status, body.slice(0,7000));
  } catch (error) {console.log(name, error.message, error.cause?.code)}
}
