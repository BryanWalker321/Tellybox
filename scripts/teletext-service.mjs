// Optional hosted companion: no player, importer or broadcast worker is started.
import http from 'node:http';
import path from 'node:path';
import {TeletextFeeds} from '../lib/teletext-feeds.mjs';
import {createTeletextHandler} from '../lib/teletext-export.mjs';
import {companionCatalogueReader} from '../lib/teletext-catalogue.mjs';
const directory=path.resolve(process.env.DATA_DIR||'data');
const feeds=new TeletextFeeds({file:path.join(process.env.TELETEXT_CACHE_DIR||directory,'teletext-feeds-v2.json')});
const handler=createTeletextHandler({getConfig:companionCatalogueReader(directory),getFeeds:()=>feeds.get()});
http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/teletext-feeds'){const body=JSON.stringify(await feeds.get());res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(req.method==='HEAD'?undefined:body);}if(await handler(req,res,url))return;res.writeHead(404);res.end();}catch{res.writeHead(503,{'Content-Type':'text/plain','Retry-After':'30'});res.end('Teletext temporarily unavailable');}}).listen(Number(process.env.TELETEXT_PORT||4188),'127.0.0.1',()=>console.log('Tellytext companion ready'));
