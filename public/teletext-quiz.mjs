import {questions} from './quiz-questions.mjs';
export const QUIZ_LENGTH=12;
export function quizDay(stamp=Date.now()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(stamp);
 const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
function seed(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function shuffled(values,key){let n=seed(key);const a=[...values];for(let i=a.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function dailyQuestions(day){
 const ordinal=Math.floor(Date.parse(day+'T00:00:00Z')/86400000);
 const categories=[...new Set(questions.map(q=>q.category))];
 return shuffled(categories,day).map(category=>{
  const pool=questions.filter(q=>q.category===category),block=Math.floor(ordinal/pool.length),offset=((ordinal%pool.length)+pool.length)%pool.length;
  const q=shuffled(pool,category+':'+block)[offset];
  const answers=shuffled(q.answers.map((text,index)=>({text,correct:index===0})),day+q.id);
  return {...q,answers:answers.map(a=>a.text),correct:answers.findIndex(a=>a.correct)};
 });
}
