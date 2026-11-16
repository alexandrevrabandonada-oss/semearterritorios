'use strict';
// Single-use child: stdin is the PDF; stdout contains only the extraction response.
const parse = require('pdf-parse/lib/pdf-parse.js');
const chunks=[]; let bytes=0; let failed=false;
process.stdin.on('data',chunk=>{bytes+=chunk.length;if(bytes>10*1024*1024){failed=true;process.exitCode=2;process.stdin.destroy();return;}chunks.push(chunk)});
process.stdin.on('end',async()=>{if(failed)return;try{
 const result=await parse(new Uint8Array(Buffer.concat(chunks)),{max:41});
 if(!Number.isInteger(result.numpages)||result.numpages<1||result.numpages>40||result.text.length>1000000)throw Error('limit');
 process.stdout.write(JSON.stringify({text:result.text,pages:result.numpages}));
}catch{process.exitCode=2}});
