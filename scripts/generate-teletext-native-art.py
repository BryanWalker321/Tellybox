"""Rebuild native G1 artwork from the website assets. Maintainers need Pillow; receivers do not."""
from PIL import Image,ImageDraw
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
palette=[(0,0,0),(255,0,0),(0,255,0),(255,255,0),(0,0,255),(255,0,255),(0,255,255),(255,255,255)]
def indexed(im):
 return [[min(range(8),key=lambda c:sum((im.getpixel((x,y))[i]-palette[c][i])**2 for i in range(3))) for x in range(im.width)] for y in range(im.height)]
def encode(im):
 a=indexed(im);out=[]
 for y in range(0,im.height,3):
  cells=[[a[y+dy][x+dx] for dy in range(3) for dx in range(2)] for x in range(0,im.width,2)]
  states={None:(0,[])}
  for samples in cells:
   new={}
   for state,(score,codes) in states.items():
    fg,bg=state if state is not None else (7,0)
    options=[]
    if state is not None:
     bits=0;cost=0
     for i,c in enumerate(samples):
      if c==fg:bits|=1<<i
      elif c!=bg:
       cost+=3 if c==7 else 1
       if sum((palette[c][j]-palette[fg][j])**2 for j in range(3))<sum((palette[c][j]-palette[bg][j])**2 for j in range(3)):bits|=1<<i
     options.append(((fg,bg),cost,0x20+(bits&31)+(0x40 if bits&32 else 0)))
     if bg!=0:options.append(((fg,0),sum((3 if c==7 else 1) for c in samples if c!=0),28))
     if bg!=fg:options.append(((fg,fg),sum((3 if c==7 else 1) for c in samples if c!=fg),29))
    options += [((colour,bg),sum((3 if c==7 else 1) for c in samples if c!=bg),16+colour) for colour in range(8) if state is None or colour!=fg]
    for next_state,cost,code in options:
     value=(score+cost,codes+[code])
     if next_state not in new or value[0]<new[next_state][0]:new[next_state]=value
   states=new
  score,codes=min(states.values(),key=lambda v:v[0]);out.append({'cells':codes})
 return out
host=Image.new('RGB',(40,33));portrait=Image.open(root/'public/bamber-host.png').convert('RGB').resize((34,28),Image.Resampling.NEAREST);host.paste(portrait,(3,2))
tv=Image.new('RGB',(32,24));d=ImageDraw.Draw(tv)
for box,c in [((0,20,31,23),'yellow'),((3,4,28,19),'yellow'),((5,6,24,17),'blue'),((7,8,22,15),'cyan'),((9,8,20,15),'black'),((7,20,10,21),'black'),((23,20,26,21),'black'),((11,10,13,13),'white'),((17,10,19,13),'white'),((27,8,28,9),'white'),((27,12,28,13),'white')]:d.rectangle(box,fill=c)
canvas=Image.new('RGB',(24,12));canvas.paste(tv.resize((16,12),Image.Resampling.NEAREST),(4,0))

# Hand-laid Level 1 TV: Hold Mosaics fills colour-control cells, retaining
# yellow casing, blue/cyan screen border, black screen and two white eyes.
def mc(bits):return 0x20+(bits&31)+(0x40 if bits&32 else 0)
full=mc(63)
television=[
 {'cells':[19]+[mc(25 if i==4 else 38 if i==8 else 0) for i in range(1,13)]},
 {'cells':[19]+[full]*12},
 {'cells':[19,full,20,30,22,16,23,16,23,22,20,19,full]},
 {'cells':[19,full,20,30,22,16,16,16,16,22,20,19,full]},
 {'cells':[19]+[mc(3 if i in (3,10) else 63) for i in range(1,13)]}
]
output=root/'public/teletext-native-art.mjs'
output.write_text('// Native G1 rows: colour controls are placed in black outlines by a row optimiser.\nexport const quizPortrait='+json.dumps(encode(host),separators=(',',':'))+';\nexport const nativeTelevisionRows='+json.dumps(television,separators=(',',':'))+';\n',encoding='utf-8')
print('Rebuilt native Teletext artwork')
