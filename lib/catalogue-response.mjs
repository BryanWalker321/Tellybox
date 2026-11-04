import {createHash} from 'node:crypto';

// Catalogue-reader identities change on owner edits or source-health updates.
// Keep one immutable encoded response instead of serialising it per viewer.
export function createCatalogueResponse({getConfig}){
 let current;
 async function entry(){
  const config=await getConfig();
  if(current?.config===config)return current;
  const body=Buffer.from(JSON.stringify(config));
  return current={config,body,etag:'"'+createHash('sha256').update(body).digest('hex')+'"'};
 }
 const handle=async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
  const value=await entry(),tags=String(req.headers['if-none-match']||'').split(',').map(x=>x.trim().replace(/^W\//,''));
  const headers={'Content-Type':'application/json','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff',ETag:value.etag};
  if(tags.includes('*')||tags.includes(value.etag)){res.writeHead(304,headers);return res.end();}
  res.writeHead(200,{...headers,'Content-Length':value.body.length});res.end(req.method==='HEAD'?undefined:value.body);
 };
 handle.prime=entry;
 return handle;
}
