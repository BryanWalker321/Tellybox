import test from 'node:test';import assert from 'node:assert/strict';import {ProviderResolver,providerOf} from '../lib/providers.mjs';import {mediaIdentity} from '../lib/programming-stats.mjs';import {spawnSync} from 'node:child_process';import path from 'node:path';
const urls=['https://vimeo.com/38997076','https://www.vimeo.com/38997076/abcdef1234','https://player.vimeo.com/video/38997076?h=abcdef1234'];
test('Vimeo recognises video and unlisted/player URLs, rejecting unrelated hosts and non-video paths',()=>{
 for(const url of urls)assert.deepEqual(providerOf(url),{name:'vimeo',id:'38997076'});
 for(const url of ['http://vimeo.com/38997076','https://vimeo.com.evil.test/38997076','https://user:password@vimeo.com/38997076','https://vimeo.com:444/38997076','https://vimeo.com/channels/staffpicks','https://vimeo.com/ondemand/12345','https://player.vimeo.com/38997076','https://vimeo.com/38997076?h=','https://vimeo.com/38997076/not-a-hash'])assert.equal(providerOf(url),null,url);
 assert.equal(mediaIdentity(urls[0]),mediaIdentity(urls[2]));
});
test('Vimeo resolution and descriptions use the general runtime without YouTube cookies and invalidate failed cached streams',async()=>{
 const calls=[];const resolver=new ProviderResolver({python:'public-python',youtubePython:'private-youtube-python',cookieFile:'/private/youtube-cookies',run:async(exe,args,options)=>{calls.push({exe,args,cookie:options.env.YOUTUBE_COOKIE_FILE});return {stdout:JSON.stringify({description:'Archive documentary',streams:[{url:'https://cdn.example.test/sample.mp4',video:true,audio:true}]})};}});
 await resolver.resolve(urls[1]);await resolver.resolve(urls[1]);assert.equal(calls.length,1);assert.equal(calls[0].exe,'public-python');assert.equal(calls[0].cookie,'');assert.ok(calls[0].args.includes(urls[1]));
 resolver.invalidate(urls[1]);await resolver.resolve(urls[1]);assert.equal(calls.length,2);assert.equal(await resolver.describe(urls[2]),'Archive documentary');assert.equal(calls[2].cookie,'');
 const failed=new ProviderResolver({run:async()=>{throw Error('temporary failure');}});await assert.rejects(failed.resolve(urls[0]));assert.equal(failed.cache.size,0);
});
const python=process.env.PROVIDER_PYTHON||(process.platform==='win32'?'python':'python3');const available=spawnSync(python,['-c','import yt_dlp'],{stdio:'ignore',windowsHide:true}).status===0;
test('Python Vimeo extraction preserves privacy hashes, filters headers and rejects DRM/private/live sources',{skip:!available},()=>{
 for(const mode of ['normal','drm','private','live']){
 const script=`import sys,runpy,yt_dlp\nfrom unittest.mock import patch\ndef extract(self,url,download=False):\n assert url=='https://player.vimeo.com/video/38997076?h=abcdef1234'\n assert not self.params.get('cookiefile')\n assert not self.params.get('extractor_args',{}).get('youtube')\n value={'id':'38997076','title':'Archive documentary','duration':604,'url':'https://cdn.example.test/sample.mp4','vcodec':'avc1','acodec':'mp4a','http_headers':{'Referer':'https://vimeo.com/','Cookie':'must-not-leak','X-Test':'no','Origin':'bad\\r\\nheader'}}\n mode=sys.argv[2]\n if mode=='drm':value['has_drm']=True\n if mode=='private':value['availability']='private'\n if mode=='live':value['is_live']=True\n return value\nentry=sys.argv[1];sys.argv=[entry,'https://vimeo.com/38997076/abcdef1234',sys.argv[2]]\nwith patch.object(yt_dlp.YoutubeDL,'extract_info',extract):runpy.run_path(entry,run_name='__main__')`;
 const r=spawnSync(python,['-c',script,path.resolve('scripts/resolve-provider.py'),mode],{env:{...process.env,YOUTUBE_COOKIE_FILE:'/does-not-exist/private-youtube-session'},windowsHide:true,encoding:'utf8'});const d=JSON.parse(r.stdout);
 if(mode==='normal'){assert.equal(r.status,0,r.stderr);assert.deepEqual(d.streams[0].headers,{'Referer':'https://vimeo.com/'});}else{assert.equal(r.status,1);assert.equal(d.code,'restricted_media');}
 assert.ok(!r.stdout.includes('must-not-leak'));assert.ok(!r.stderr.includes('private-youtube-session'));
 }
});
import {directM3u} from '../lib/iptv.mjs';
test('direct-file playlists exclude Vimeo watch pages while shared live feeds remain the playback route',()=>{
 const epoch='2026-10-25T00:00:00Z';for(const url of urls){const config={epoch,brand:{name:'Test station'},channels:[{id:'test',name:'Test',number:1,programmes:[{id:'film',title:'Film',url,duration:600}]}]};assert.ok(!directM3u(config,'https://station.example',Date.parse(epoch)+1000).includes(url));}
});
