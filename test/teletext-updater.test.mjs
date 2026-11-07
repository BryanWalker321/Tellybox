import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createTeletextSnapshot} from '../lib/teletext-export.mjs';
test('receiver updater verifies archives before writing and preserves other service folders',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'tellytext-updater-'));
 try{const snapshot=createTeletextSnapshot({brand:{name:'Example'},channels:[],epoch:'2026-01-01'},{feeds:{}},Date.parse('2026-11-07'));await writeFile(path.join(temp,'service.tar'),snapshot.tar);
 const script=`import importlib.util,pathlib,sys,io,tarfile\nspec=importlib.util.spec_from_file_location('updater','scripts/update-teletext.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\np=pathlib.Path(sys.argv[1]);raw=(p/'service.tar').read_bytes();target=p/'pages'\nm.install(raw,target);before=(target/'401.tti').stat().st_mtime_ns;m.install(raw,target);assert (target/'401.tti').stat().st_mtime_ns==before\nother=p/'other';other.mkdir();(other/'keep.txt').write_text('keep')\ntry: m.install(raw,other);raise AssertionError('Modified another service')\nexcept ValueError: pass\nassert (other/'keep.txt').read_text()=='keep'\nb=io.BytesIO()\nwith tarfile.open(fileobj=b,mode='w') as t:\n i=tarfile.TarInfo('../escape.tti');i.size=1;t.addfile(i,io.BytesIO(b'x'))\ntry: m.install(b.getvalue(),target);raise AssertionError('Accepted traversal')\nexcept ValueError: pass\nassert not (p/'escape.tti').exists()\nbroken=bytearray(raw);broken[600]^=1\ntry: m.install(bytes(broken),target);raise AssertionError('Accepted damaged page')\nexcept ValueError: pass\nassert (target/'401.tti').stat().st_mtime_ns==before\nprint('Updater integrity and isolation passed')`;
 const output=execFileSync(process.platform==='win32'?'python':'python3',['-c',script,temp],{encoding:'utf8',windowsHide:true});assert.match(output,/integrity and isolation passed/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
