import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
const html=await readFile('dist/index.html','utf8');
assert(!/(?:src|href)="\/(?!\/)/.test(html),'Root-relative asset path breaks repository hosting.');
for(const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))await access(`dist/${match[1]}`);
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
for(const icon of manifest.icons){const bytes=await readFile(`dist/${icon.src}`);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));}
const worker=await readFile('dist/sw.js','utf8');
assert(!worker.includes('__VERSION__')&&!worker.includes('__FILES__'));
assert(worker.includes('index.html')&&worker.includes('assets/'));
await access('dist/.nojekyll');
for(const file of ['attribution/google-maps.svg','privacy.html','terms.html'])await access(`dist/${file}`);
for(const file of await readdir('dist/assets'))if(file.endsWith('.js')){
  const source=await readFile(`dist/assets/${file}`,'utf8');
  assert(!/AIza[0-9A-Za-z_-]{35}/.test(source),'A Google API key must never appear in a browser asset.');
  assert(!source.includes('GOOGLE_MAPS_API_KEY'),'Worker secret configuration leaked into the browser build.');
}
console.log('Production assets, manifest, PNG sizes, relative paths, and offline shell verified.');
