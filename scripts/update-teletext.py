#!/usr/bin/env python3
"""Download a verified Tellytext snapshot into a dedicated VBIT2 service folder."""
import argparse, hashlib, io, json, os, pathlib, re, tarfile, urllib.request

def install(archive, target):
    # Never extract paths from an archive onto the filesystem.
    if len(archive)>16*1024*1024: raise ValueError('Snapshot exceeds size limit')
    with tarfile.open(fileobj=io.BytesIO(archive),mode='r:') as tar:
        members=tar.getmembers()
        if len(members)>1000 or any(not m.isfile() or not re.fullmatch(r'(?:[1-8]\d\d\.tti|manifest\.json)',m.name) or m.size>1024*1024 for m in members):
            raise ValueError('Invalid snapshot entries')
        if len({m.name for m in members})!=len(members): raise ValueError('Duplicate entry')
        data={m.name:tar.extractfile(m).read() for m in members}
    manifest=json.loads(data.pop('manifest.json'))
    if manifest.get('format')!='tellytext-tti-v1': raise ValueError('Unsupported snapshot')
    listed=manifest['files']
    if set(data)!={f['name'] for f in listed} or len(listed)!=len(data): raise ValueError('Incomplete snapshot')
    for f in listed:
        body=data[f['name']]
        if len(body)!=f['bytes'] or hashlib.sha256(body).hexdigest()!=f['sha256']: raise ValueError('Snapshot checksum failed')
    target=pathlib.Path(target).resolve()
    if target==pathlib.Path(target.anchor): raise ValueError('A dedicated service folder is required')
    marker=target/'.tellytext-service'
    if target.exists() and any(target.iterdir()) and not marker.is_file(): raise ValueError('Refusing to modify a nonempty folder without a Tellytext marker')
    if target.exists() and any(p.is_symlink() for p in target.iterdir()): raise ValueError('Service folder must not contain symlinks')
    target.mkdir(parents=True,exist_ok=True)
    # Mark ownership before installing; later runs can recover an interrupted initial install.
    marker.write_text('Managed by update-teletext.py\n',encoding='utf-8')
    for name,body in sorted(data.items(),key=lambda pair:pair[0] in ('100.tti','101.tti','123.tti')):
        destination=target/name
        if destination.exists() and destination.read_bytes()==body: continue
        temporary=target/(name+'.tmp');temporary.write_bytes(body);os.replace(temporary,destination)
    for old in target.glob('*.tti'):
        if old.name not in data: old.unlink()
    temporary=target/'manifest.json.tmp';temporary.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8');os.replace(temporary,target/'manifest.json')
    return manifest

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',required=True,help='Station base URL, e.g. https://telly-box.uk')
    parser.add_argument('--directory',required=True,help='Dedicated, initially empty VBIT2 service folder')
    args=parser.parse_args()
    if not args.url.startswith(('https://','http://')): parser.error('An HTTP(S) station URL is required')
    request=urllib.request.Request(args.url.rstrip('/')+'/teletext/service.tar',headers={'User-Agent':'Tellytext-Updater/1'})
    with urllib.request.urlopen(request,timeout=30) as response: archive=response.read(16*1024*1024+1)
    result=install(archive,args.directory)
    print('Installed',len(result['files']),'Teletext pages; revision',result['revision'])
