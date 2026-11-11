import test from 'node:test';
import assert from 'node:assert/strict';
import {isSameOriginRequest,readBoundedBody,readBoundedFormData} from '../lib/fec-intake-http.ts';

test('só aceita origem explícita igual ao destino',()=>{
 const req=(origin)=>new Request('https://semear.test/api',{headers:origin?{origin}:{}});
 assert.equal(isSameOriginRequest(req('https://semear.test')),true);
 for(const origin of [undefined,'null','https://outro.test','https://semear.test.evil.test','https://semear.test:444'])assert.equal(isSameOriginRequest(req(origin)),false);
});
test('limita corpo recebido mesmo sem Content-Length',async()=>{
 const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(6));c.enqueue(new Uint8Array(6));c.close();}});
 const req=new Request('https://semear.test/api',{method:'POST',body,duplex:'half'});
 await assert.rejects(readBoundedBody(req,10),/excessivo/);
});
test('rejeita Content-Length acima do máximo e tipo não multipart',async()=>{
 await assert.rejects(readBoundedBody(new Request('https://semear.test/api',{method:'POST',headers:{'content-length':'999'},body:'x'}),10));
 await assert.rejects(readBoundedFormData(new Request('https://semear.test/api',{method:'POST',body:'x'}),100));
});

test('valida MIME, extensão e assinatura antes de analisar',async()=>{
 const {validFecFileType}=await import('../lib/fec-intake-http.ts');
 const pdf=new TextEncoder().encode('%PDF-1.7');
 assert.equal(validFecFileType('a.pdf','application/pdf',pdf),true);
 assert.equal(validFecFileType('a.pdf','image/png',pdf),false);
 assert.equal(validFecFileType('a.docx','application/pdf',pdf),false);
 assert.equal(validFecFileType('a.pdf','application/pdf',new Uint8Array([1,2,3])),false);
 assert.equal(validFecFileType('a.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',new Uint8Array([80,75,3,4])),true);
 assert.equal(validFecFileType('a.txt','text/plain',new Uint8Array([65,0]),true),false);
});

test('compara Origin ao Host recebido quando Next normaliza a URL interna',()=>{
 const req=new Request('http://localhost:56440/api',{headers:{origin:'http://127.0.0.1:56440',host:'127.0.0.1:56440'}});
 assert.equal(isSameOriginRequest(req),true);
 const wrong=new Request('http://localhost:56440/api',{headers:{origin:'http://outro.test',host:'127.0.0.1:56440'}});
 assert.equal(isSameOriginRequest(wrong),false);
});
