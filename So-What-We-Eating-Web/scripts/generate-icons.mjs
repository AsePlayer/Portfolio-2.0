import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
// Dependency-free raster companion to the original SVG mark. Regenerate after art changes.
function crc32(bytes) { let crc=0xffffffff; for(const byte of bytes){crc^=byte;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0; }
function chunk(name, data) { const type=Buffer.from(name),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([size,type,data,crc]); }
function png(size) {
  const rows=Buffer.alloc((size*4+1)*size),paper=[244,240,230,255],red=[183,56,36,255];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=x/size*512,py=y/size*512,d=Math.hypot(px-256,py-256);
    const ring=d<166&&d>124;
    const bowl=py>=267&&py<=343&&Math.hypot(px-256,py-267)<=76;
    const steam=[214,256,298].some(cx=>py>=194&&py<=239&&Math.abs(px-(cx+Math.sin((py-194)/45*Math.PI*2)*5))<6);
    const foot=py>=340&&py<=351&&px>=202&&px<=310;
    rows.set(ring||bowl||steam||foot?red:paper,y*(size*4+1)+1+x*4);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
await mkdir('public/icons',{recursive:true});
for(const [name,size] of [['icon-192',192],['icon-512',512],['icon-maskable',512],['apple-touch-icon',180]])await writeFile(`public/icons/${name}.png`,png(size));
console.log('Generated 192/512px install icons and 180px Apple icon.');
