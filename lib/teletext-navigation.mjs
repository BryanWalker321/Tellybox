// Fastext links address actual pages. Extra screens receive real page numbers,
// so an ordinary receiver can select them using its own colour-key support.
const indices=new Set(['101','123','200','300']);
const link=(label,page)=>({label,page:String(page)});
export function colourNavigation(basePages,previousTargets=new Map()){
 const reserved=new Set(basePages.map(p=>p.page)),available=[...Array.from({length:200},(_,i)=>700+i),...Array.from({length:100},(_,i)=>500+i),...Array.from({length:700},(_,i)=>100+i)].filter((n,i,a)=>!reserved.has(String(n))&&a.indexOf(n)===i),targets=new Map();
 for(const entry of basePages)entry.subpages.forEach((_,i)=>{const key=entry.page+':'+i,old=previousTargets.get(key);if(i===0)targets.set(key,entry.page);else if(old&&available.includes(Number(old))&&!Array.from(targets.values()).includes(old))targets.set(key,old);});
 for(const entry of basePages)entry.subpages.forEach((_,i)=>{const key=entry.page+':'+i;if(targets.has(key))return;let next;do{next=available.shift();}while(next!==undefined&&Array.from(targets.values()).includes(String(next)));if(next===undefined)throw Error('Teletext page capacity exceeded');targets.set(key,String(next));});
 previousTargets.clear();for(const [key,value] of targets)previousTargets.set(key,value);
 const target=(page,i=0)=>targets.get(String(page)+':'+i)||String(page);
 const result=[];
 for(const [position,entry] of basePages.entries()){
  const page=entry.page,count=entry.subpages.length,isIndex=indices.has(page),quiz=Number(page)>=400&&Number(page)<=414;
  const previous=basePages[(position+basePages.length-1)%basePages.length],next=basePages[(position+1)%basePages.length];
  const models=entry.subpages.map((m,i)=>{
   let links=m.links;
   if(!quiz&&page!=='100'){
    let prev=i>0?target(page,i-1):target(previous.page,previous.subpages.length-1),after=i<count-1?target(page,i+1):target(next.page),parent='100',blue='100';
    if(isIndex){prev=target(page,(i+count-1)%count);after=target(page,(i+1)%count);blue=page==='101'?'123':page==='123'?'145':'101';}
    else if(Number(page)>=102&&Number(page)<=121){parent='101';const stories=basePages.filter(p=>Number(p.page)>=102&&Number(p.page)<=121&&p.subpages[0].available!==false),before=stories.filter(p=>Number(p.page)<Number(page)).at(-1),later=stories.find(p=>Number(p.page)>Number(page));if(i===0)prev=before?target(before.page,before.subpages.length-1):target('101',basePages.find(p=>p.page==='101').subpages.length-1);if(i===count-1)after=later?target(later.page):'101';}
    else if(Number(page)>=124&&Number(page)<=144){parent='123';if(i===0&&page==='124')prev=target('123',basePages.find(p=>p.page==='123').subpages.length-1);if(i===count-1&&page==='144')after='123';}
    links=[link(parent==='100'?'Main index':'Section index',parent),link('Previous',prev),link('Next',after),link(isIndex?(page==='101'?'Sport':page==='123'?'Weather':'News'):'Main index',blue)];
   }else if(page==='100')links=[link('News',101),link('Sport',123),link('TV now',601),link('TV next',602)];
   return {...m,basePage:page,links,autoRotate:isIndex&&count>1,rotationSeconds:isIndex?10:0};
  });
  result.push({page,subpages:isIndex?models:[models[0]]});
  for(let i=1;i<count;i++){const alias=target(page,i),screens=isIndex?[...models.slice(i),...models.slice(0,i)]:[models[i]];result.push({page:alias,subpages:screens.map(m=>({...m,page:alias}))});}
 }
 return result;
}
