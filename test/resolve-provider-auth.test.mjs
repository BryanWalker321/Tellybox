import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp, writeFile, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const python=process.env.PROVIDER_PYTHON || (process.platform==='win32'?'python':'python3');
const available=spawnSync(python,['-c','import yt_dlp'],{windowsHide:true,stdio:'ignore'}).status===0;
test('the Python resolver uses an in-memory authenticated cookie jar without writing session files or printing secrets', {skip:!available}, async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'tellybox-owner-test-'));
  const cookieFile=path.join(directory,'youtube-cookies.txt');
  await writeFile(cookieFile,`# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t${Math.floor(Date.now()/1000)+3600}\tSID\tfictional-test-session\n`);
  const script=`import sys,os,runpy,yt_dlp
from unittest.mock import patch
def extract(self,url,download=False):
 assert 'SID=fictional-test-session' in self.cookiejar.get_cookie_header('https://www.youtube.com/')
 assert self.params['extractor_args']['youtube']['player_client']==['default','web_safari']
 assert self.params['format'].startswith('best[height<=576][protocol^=m3u8]')
 os.remove(os.environ['YOUTUBE_COOKIE_FILE'])
 return {'id':'y9CsvDblsr0','title':'Fixture','duration':10,'url':'https://media.example.test/video.mp4','vcodec':'avc1','acodec':'mp4a'}
sys.argv=[sys.argv[1],'https://www.youtube.com/watch?v=y9CsvDblsr0']
with patch.object(yt_dlp.YoutubeDL,'extract_info',extract):runpy.run_path(sys.argv[0],run_name='__main__')`;
  try {
    const result=spawnSync(python,['-c',script,path.resolve('scripts/resolve-provider.py')],{env:{...process.env,YOUTUBE_COOKIE_FILE:cookieFile},windowsHide:true,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr+result.stdout);
    assert.equal(JSON.parse(result.stdout).title,'Fixture');
    assert.ok(!result.stdout.includes('fictional-test-session'));
    assert.ok(!result.stderr.includes('fictional-test-session'));
    await assert.rejects(stat(cookieFile),/ENOENT/,'yt-dlp must not recreate a disconnected session when exiting');
  } finally {if(directory.startsWith(path.join(tmpdir(),'tellybox-owner-test-')))await rm(directory,{recursive:true,force:true});}
});

test('an optional private token service selects the attested YouTube client without exposing service details', {skip:!available},()=>{
 const script=`import sys,runpy,yt_dlp
from unittest.mock import patch
def extract(self,url,download=False):
 assert self.params['extractor_args']['youtube']['player_client']==['default','mweb']
 assert self.params['extractor_args']['youtubepot-bgutilhttp']['base_url']==['http://pot-provider:4416']
 assert self.params['check_formats'] is True
 assert self.params['paths']['temp']
 return {'id':'y9CsvDblsr0','title':'Fixture','duration':10,'url':'https://media.example.test/video.mp4','vcodec':'avc1','acodec':'mp4a'}
sys.argv=[sys.argv[1],'https://www.youtube.com/watch?v=y9CsvDblsr0']
with patch.object(yt_dlp.YoutubeDL,'extract_info',extract):runpy.run_path(sys.argv[0],run_name='__main__')`;
 const result=spawnSync(python,['-c',script,path.resolve('scripts/resolve-provider.py')],{env:{...process.env,YOUTUBE_COOKIE_FILE:'',YOUTUBE_PO_TOKEN_BASE_URL:'http://pot-provider:4416'},windowsHide:true,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr+result.stdout);
 assert.equal(JSON.parse(result.stdout).title,'Fixture');
 assert.ok(!result.stdout.includes('pot-provider'));
});
