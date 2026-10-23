"""Render hosting Markdown into the in-site guide fragment."""
from pathlib import Path
import argparse, html, re
parser=argparse.ArgumentParser()
parser.add_argument('--source',default='docs/HOSTING.md')
parser.add_argument('--output',default='public/hosting-guide.html')
args=parser.parse_args()
def inline(text):
 text=html.escape(text)
 def link(m):
  label,url=m.groups()
  if re.fullmatch(r'[A-Z_]+\.md(?:#[\w-]+)?',url):url='https://github.com/BryanWalker321/Tellybox/blob/main/docs/'+url
  if not url.startswith(('https://','http://')):return label
  return '<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+' ↗</a>'
 text=re.sub(r'\[([^]]+)\]\(([^)]+)\)',link,text)
 text=re.sub(r'`([^`]+)`',r'<code>\1</code>',text)
 return re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
out=['<div class="hosting-intro"><a class="hosting-download" id="hosting-download" href="https://github.com/BryanWalker321/Tellybox/releases/latest" target="_blank" rel="noopener noreferrer">Get the self-hosted starter ↗</a><p>One channel · two playable demo programmes · your own name and logo · MIT application code.</p><p id="hosting-download-status">Read the installation steps below. Your own media, station settings and schedules stay separate from application updates.</p></div>']
code=False;listing=None;section=False
def close_list():
 global listing
 if listing:out.append('</'+listing+'>');listing=None
for line in Path(args.source).read_text(encoding='utf-8').splitlines():
 if line.startswith('```'):
  close_list();out.append('</code></pre>' if code else '<pre><code>');code=not code;continue
 if code:out.append(html.escape(line)+'\n');continue
 if line.startswith('# '):continue
 if line.startswith('## '):
  close_list()
  if section:out.append('</div></details>')
  out.append('<details class="hosting-step"><summary>'+inline(line[3:])+'</summary><div>');section=True;continue
 if line.startswith('### '):close_list();out.append('<h3>'+inline(line[4:])+'</h3>');continue
 match=re.match(r'^(?:(\d+)\. |[-*] )(.*)',line)
 if match:
  kind='ol' if match[1] else 'ul'
  if listing!=kind:
   close_list();out.append('<ol start="'+match[1]+'">' if kind=='ol' else '<ul>');listing=kind
  out.append('<li>'+inline(match[2])+'</li>');continue
 if not line:continue
 close_list();out.append('<p>'+inline(line)+'</p>')
close_list()
if section:out.append('</div></details>')
Path(args.output).write_text('\n'.join(out)+'\n',encoding='utf-8')
