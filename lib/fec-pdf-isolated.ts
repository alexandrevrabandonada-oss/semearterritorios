import {spawn} from "node:child_process";
import {join} from "node:path";
import {FEC_MAX_UPLOAD} from "./fec-upload-limits.mjs";

/** Runs PDF parsing out of process; no user-provided value is used as a path or option. */
export function extractFecPdf(buffer:Buffer, options:{workerPath?:string; timeoutMs?:number}={}):Promise<string> {
 const workerPath=options.workerPath ?? join(process.cwd(),"server","fec-pdf-worker.cjs");
 const timeoutMs=options.timeoutMs ?? 15000;
 if(buffer.length===0 || buffer.length>FEC_MAX_UPLOAD) return Promise.reject(new Error("Documento fora do limite de 4 MB."));
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,["--max-old-space-size=192",workerPath],{stdio:["pipe","pipe","ignore"],windowsHide:true});
  const chunks:Buffer[]=[];let total=0;let killed=false;let started=false;
  const stop=()=>{killed=true;child.kill("SIGKILL");};
  const timer=setTimeout(stop,timeoutMs);
  child.once("spawn",()=>{started=true;child.stdin.end(buffer);});
  child.stdin.on("error",()=>{});
  child.stdout.on("data",(chunk:Buffer)=>{total+=chunk.length;if(total>3*1024*1024)stop();else chunks.push(chunk);});
  child.once("error",()=>{clearTimeout(timer);reject(new Error("Processador isolado indisponível."));});
  child.once("close",(code)=>{clearTimeout(timer);if(!started)return;
   if(killed||code!==0){reject(new Error("Documento recusado por limite ou falha de processamento."));return;}
   try{const data=JSON.parse(Buffer.concat(chunks).toString("utf8"));if(typeof data.text!=="string"||!Number.isInteger(data.pages)||data.pages<1||data.pages>40||data.text.length>1000000)throw Error();resolve(data.text);}
   catch{reject(new Error("Resposta inválida do processador isolado."));}
  });
 });
}
