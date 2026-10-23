import {readFile,stat} from 'node:fs/promises';

// Keep channel identities stable so compiled schedules survive HLS polling.
// Owner edits and source-health updates still invalidate the snapshot.
export function createCatalogueReader({configPath,healthPath,validate,applyHealth}){
 let cached;const pending=new Map();
 async function stamp(file,optional=false){try{const s=await stat(file,{bigint:true});return `${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;}catch(error){if(optional&&error.code==='ENOENT')return 'missing';throw error;}}
 async function signature(){return (await Promise.all([stamp(configPath),stamp(healthPath,true)])).join('|');}
 return async function readCatalogue(){
  for(let attempt=0;attempt<4;attempt++){
   const key=await signature();if(cached?.key===key)return cached.value;
   let work=pending.get(key);
   if(!work){work=(async()=>{const [text,healthText]=await Promise.all([readFile(configPath,'utf8'),readFile(healthPath,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;})]);
    const value=applyHealth(validate(JSON.parse(text)),healthText?JSON.parse(healthText):null);
    if(await signature()!==key)return null;
    cached={key,value};return value;
   })();pending.set(key,work);}
   try{const value=await work;if(value)return value;}finally{if(pending.get(key)===work)pending.delete(key);}
  }
  throw Error('The station catalogue changed repeatedly while being read. Retry shortly.');
 };
}
