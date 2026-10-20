const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function feedLines(value,width=40){const words=String(value||'').replace(/\s+/g,' ').trim().toUpperCase().split(' '),lines=[];let row='';for(let word of words){while(word.length>width){if(row){lines.push(row);row='';}lines.push(word.slice(0,width));word=word.slice(width);}if((row+' '+word).trim().length>width){lines.push(row);row=word;}else row=(row+' '+word).trim();}if(row)lines.push(row);return lines;}
const row=(value,colour='white')=>`<div class="tt-row tt-${colour}">${esc(value||' ')}</div>`;
const rows=(value,colour)=>feedLines(value).map(text=>row(text,colour)).join('');
function link(value){try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='bbc.co.uk'||u.hostname.endsWith('.bbc.co.uk')||u.hostname==='bbc.com'||u.hostname.endsWith('.bbc.com'))?u.href:null;}catch{return null;}}
function time(value){if(!value)return 'TIME UNAVAILABLE';const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replace(',',''):'TIME UNAVAILABLE';}
export function renderFeedPage(key,data,requested=0){
 const names={news:'BBC NEWS',sport:'BBC SPORT',weather:'LONDON WEATHER'},sources={news:'https://www.bbc.co.uk/news',sport:'https://www.bbc.co.uk/sport',weather:'https://www.bbc.co.uk/weather/2643743'};const feed=data?.feeds?.[key];
 const footer=`<a class="tt-feed-source tt-cyan" href="${sources[key]}" target="_blank" rel="noopener noreferrer">SOURCE: ${key==='weather'?'BBC WEATHER':names[key]} - READ MORE</a>`;
 if(!feed?.items?.length)return {heading:names[key],subpages:1,subpage:0,body:row(data?'FEED TEMPORARILY UNAVAILABLE':'CONNECTING TO THE FEED...','yellow')+row(' ')+rows('Please try again shortly. The rest of Teletext is still available.','white')+row(' ')+footer};
 let groups=[];
 if(key==='weather'){for(const item of feed.items){const lines=[...feedLines(item.title).map(text=>({text,colour:'yellow'})),{text:' '},...feedLines(item.description).map(text=>({text})),{text:' '},{text:'ISSUED '+time(item.publishedAt||feed.issuedAt),colour:'green'}];for(let i=0;i<lines.length;i+=14)groups.push([{...item,weatherLines:lines.slice(i,i+14)}]);}}
 else{let group=[],used=0;const segments=feed.items.flatMap(item=>{const lines=feedLines(item.title),parts=[];for(let i=0;i<lines.length;i+=12)parts.push({...item,titleLines:lines.slice(i,i+12)});return parts;});for(const item of segments){if(!link(item.url))continue;const size=item.titleLines.length+2;if(used+size>14&&group.length){groups.push(group);group=[];used=0;}group.push(item);used+=size;}if(group.length)groups.push(group);}
 if(!groups.length)return {heading:names[key],subpages:1,subpage:0,body:row('FEED TEMPORARILY UNAVAILABLE','yellow')+footer};
 const subpages=groups.length,subpage=Math.max(0,Math.min(subpages-1,requested));let body=row((feed.stale?'CACHED ':'UPDATED ')+time(feed.updatedAt),'cyan');
 if(feed.stale)body+=row('UPDATE UNAVAILABLE - OLDER INFORMATION','yellow');else body+=row(' ');
 for(const item of groups[subpage]){
  if(key==='weather')body+=item.weatherLines.map(line=>row(line.text,line.colour)).join('');
  else body+=`<a class="tt-feed-story" href="${esc(link(item.url))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(item.title)}">${item.titleLines.map(text=>row(text,'yellow')).join('')}${row(time(item.publishedAt),'white')}</a>`+row(' ');
 }
 body+=footer;return {heading:names[key],body,subpages,subpage};
}
