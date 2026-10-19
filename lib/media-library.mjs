import path from 'node:path';
import {readdir,realpath} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),inside=(root,p)=>p===root||p.startsWith(root+path.sep);
export async function listMediaFolders(root,folder=''){
 if(typeof folder!=='string'||folder.length>500||path.isAbsolute(folder)||folder.includes('\\')||folder.split('/').some(p=>p==='..')||folder.includes(':'))throw Object.assign(Error('Choose a folder inside the station media directory.'),{status:400});
 const base=await realpath(root),start=await realpath(path.resolve(base,folder));
 if(!inside(base,start))throw Object.assign(Error('Folder must stay inside the station media directory.'),{status:400});
 const relative=path.relative(base,start).split(path.sep).join('/');
 const folders=(await readdir(start,{withFileTypes:true})).filter(p=>p.isDirectory()&&!p.isSymbolicLink()).sort((a,b)=>a.name.localeCompare(b.name)).map(p=>({name:p.name,path:[relative,p.name].filter(Boolean).join('/')}));
 return {folder:relative,parent:relative?relative.split('/').slice(0,-1).join('/'):null,folders};
}
export async function scanMediaFolder(root,folder='',{probe,limit=200}={}){
 if(typeof folder!=='string'||folder.length>500||path.isAbsolute(folder)||folder.includes('\\')||folder.split('/').some(p=>p==='..')||folder.includes(':'))throw Object.assign(Error('Use a folder relative to the station media directory, such as adverts/1980s.'),{status:400});
 const base=await realpath(root),start=await realpath(path.resolve(base,folder));
 if(!inside(base,start))throw Object.assign(Error('Folder must stay inside the station media directory.'),{status:400});
 const files=[];let truncated=false;
 async function walk(dir,depth=0){if(depth>8){truncated=true;return;}for(const item of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(files.length>=limit){truncated=true;return;}if(item.isSymbolicLink())continue;const file=path.join(dir,item.name);if(item.isDirectory())await walk(file,depth+1);else if(item.isFile()&&/\.(mp4|webm|m4v|mp3)$/i.test(item.name))files.push(file);}}
 await walk(start);const result=[];let cursor=0;const deadline=Date.now()+55000;
 const durationOf=probe||(async(file)=>{const {stdout}=await exec(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',file],{timeout:8000,maxBuffer:65536,windowsHide:true});const data=JSON.parse(stdout);return {duration:Number(data.format.duration),hasVideo:data.streams?.some(s=>s.codec_type==='video')};});
 await Promise.all(Array.from({length:2},async()=>{while(cursor<files.length){if(Date.now()>deadline){truncated=true;return;}const file=files[cursor++];try{const resolved=await realpath(file);if(!inside(base,resolved))continue;const info=await durationOf(resolved),duration=typeof info==='number'?info:info.duration,name=path.relative(base,resolved).split(path.sep).join('/');if(typeof info==='object'&&!info.hasVideo){result.push({name,error:'A video stream is required for television playback.'});continue;}if(Number.isFinite(duration)&&duration>0)result.push({name,url:'/media/'+name.split('/').map(encodeURIComponent).join('/'),duration,title:path.basename(name,path.extname(name))});else result.push({name:path.basename(file),error:'Duration unavailable'});}catch{result.push({name:path.basename(file),error:'Could not read media; check the file and FFprobe installation.'});}}}));
 return {folder,files:result.sort((a,b)=>a.name.localeCompare(b.name)),truncated};
}
