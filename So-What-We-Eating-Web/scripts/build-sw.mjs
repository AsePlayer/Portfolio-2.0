import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(path='') {
  const files=[];
  for(const entry of await readdir(`dist/${path}`,{withFileTypes:true})){
    const local=path+entry.name;
    if(entry.isDirectory())files.push(...await walk(`${local}/`));else if(!['sw.js','.nojekyll'].includes(local))files.push(local);
  }
  return files.sort();
}
const files=await walk(),template=await readFile('scripts/service-worker.js','utf8');
const hash=createHash('sha256').update(template);
for(const file of files)hash.update(file).update(await readFile(`dist/${file}`));
await writeFile('dist/sw.js',template.replace('__VERSION__',hash.digest('hex').slice(0,16)).replace('__FILES__',JSON.stringify(files)));
await writeFile('dist/.nojekyll','');
console.log(`Versioned offline shell: ${files.length} files.`);
