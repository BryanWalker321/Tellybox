// Shared, bounded page data for the website, JSON clients and traditional Teletext.
import {dailyQuestions,quizDay} from './teletext-quiz.mjs';
export const colourNames=['red','green','yellow','blue'];
export const text=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/[–—]/g,'-').replace(/[^\x20-\x7e£]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
export function wrap(value,width=38){const lines=[];let current='';for(let word of text(value).split(' ')){while(word.length>width){if(current){lines.push(current);current='';}lines.push(word.slice(0,width));word=word.slice(width);}if((current+' '+word).trim().length>width){lines.push(current);current=word;}else current=(current+' '+word).trim();}if(current)lines.push(current);return lines;}
const rows=(value,colour='white')=>wrap(value).map(text=>({text,colour}));
const link=(label,page)=>({label,page:String(page)});
const time=value=>{const d=new Date(value);return value&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d).replace(',',''):'TIME UNAVAILABLE';};
export function quizPage(page,stamp=Date.now()){
 const number=Number(page);if(number<400||number>414)return null;
 const items=dailyQuestions(quizDay(stamp)),index=number-401;
 const result={page:String(page),heading:'BOX BAFFLER! '+quizDay(stamp).split('-').reverse().join('/'),rows:[],links:[],subpage:0,subpages:1};
 if(number===400){result.rows=[...rows('THE DAILY DOZEN','yellow'),...rows('Twelve questions. Choose an answer with a coloured key.'),...rows('A wrong answer leads to page 414. Press red there to start again.'),...rows('A fresh quiz at UK midnight.','cyan')];result.links=[link('Start',401),link('Index',100),link('TV now',601),link('Help',199)];}
 else if(number===413){result.rows=[...rows('YOU BEAT THE BOX!','yellow'),...rows('All twelve answers correct.'),...rows('Come back tomorrow for a fresh dozen.','cyan')];result.links=[link('Play again',401),link('Index',100),link('TV now',601),link('Quiz',400)];}
 else if(number===414){result.rows=[...rows('WRONG ANSWER!','yellow'),...rows('Bamber sends you back to the start.'),...rows('Press red to try question one again.','cyan')];result.links=[link('Try again',401),link('Index',100),link('TV now',601),link('Quiz',400)];}
 else{const q=items[index];result.question=q;result.questionIndex=index;result.rows=[...rows('Q'+(index+1)+'/12 - '+q.category,'cyan'),...rows(q.question,'yellow'),{text:''},...q.answers.flatMap((a,i)=>rows(String.fromCharCode(65+i)+'. '+a,colourNames[i]))];result.links=q.answers.map((_,i)=>link(String.fromCharCode(65+i)+' / '+colourNames[i],i===q.correct?number+1:414));}
 return result;
}
export function newsPage(page,data,requested=0){
 const n=Number(page);if(!(n>=101&&n<=145))return null;
 let key,index,heading;
 if(n===145){key='weather';heading='LONDON WEATHER';}
 else if(n===101||n>=102&&n<=122){key='news';heading=n===101?'NEWS INDEX':'NEWS';index=n-102;}
 else{key=n>=124&&n<=138?'football':'otherSport';heading=n===123?'SPORT INDEX':key==='football'?'FOOTBALL':'OTHER SPORT';index=key==='football'?n-124:n-139;}
 const feed=data?.feeds?.[key],all=data?.feeds||{};
 const result={page:String(page),heading,rows:[],subpage:0,subpages:1,links:[link(n<123?'News index':'Sport index',n<123?101:123),link('Previous',n===102||n===124? n-1:Math.max(n<123?101:123,n-1)),link('Next',Math.min(n<123?121:144,n+1)),link('Main index',100)]};
 let content=[];
 if(n===101||n===123){const entries=n===101?(all.news?.pages||all.news?.items||[]).slice(0,20).map((item,i)=>({item,page:102+i})):[...(all.football?.pages||all.football?.items||[]).slice(0,15).map((item,i)=>({item,page:124+i})),...(all.otherSport?.pages||all.otherSport?.items||[]).slice(0,6).map((item,i)=>({item,page:139+i}))];
  for(const {item,page:target} of entries){if(!item)continue;const title=wrap(item.title,34);content.push(...title.map((s,i)=>({text:i===0?String(target)+' '+s:'    '+s,colour:'yellow',page:String(target)})),{text:''});}
  result.links=[link('Main index',100),link('News',101),link('Sport',123),link('Weather',145)];
  if(n===123&&[all.football,all.otherSport].some(f=>f?.stale))result.stale=true;
 }else if(n===122){content=rows('Extra news space. Latest headlines are on page 101.','cyan');result.links=[link('News index',101),link('Last story',121),link('Sport',123),link('Main index',100)];}
 else if(key==='weather'){for(const item of (feed?.items||[]).slice(0,3))content.push(...rows(item.title,'yellow'),...rows(item.description),{text:''});result.links=[link('Main index',100),link('News',101),link('Sport',123),link('Weather',145)];}
 else{const item=(feed?.pages||feed?.items)?.[index];if(item){result.source={name:item.sourceName||feed.name,url:item.url,publishedAt:item.publishedAt};content=[...rows(item.title,'yellow'),{text:''},...rows(item.text||item.description||'No story summary supplied.'),{text:''},...rows(item.text?'STORY TEXT':'RSS SUMMARY','cyan'),...rows(item.byline||'','green'),...rows(item.copyright||'','cyan'),...rows(item.licence||'','cyan'),...rows('Published '+time(item.publishedAt),'green')];} }
 if(!content.length)content=rows(data?'NO STORY CURRENTLY AVAILABLE':'CONNECTING TO THE FEED...','yellow');
 result.stale ||= Boolean(feed?.stale);result.updatedAt=feed?.updatedAt;
 const status=result.stale?'CACHED - UPDATE UNAVAILABLE':feed?.updatedAt?'UPDATED '+time(feed.updatedAt):'LATEST AVAILABLE STORIES';
 const size=14;result.subpages=Math.max(1,Math.ceil(content.length/size));result.subpage=Math.max(0,Math.min(result.subpages-1,Math.trunc(Number(requested))||0));
 result.rows=[...rows(status,'cyan').slice(0,1),{text:''},...content.slice(result.subpage*size,(result.subpage+1)*size),{text:'SOURCE: '+text(feed?.name||'BBC NEWS').slice(0,30),colour:'cyan',sourceUrl:result.source?.url||feed?.source||(n===123?'https://www.bbc.co.uk/sport':'https://www.bbc.co.uk/news')}];

 return result;
}
export function specialPage(page,sources,stamp,subpage=0){return quizPage(page,stamp)||newsPage(page,sources,subpage);}

