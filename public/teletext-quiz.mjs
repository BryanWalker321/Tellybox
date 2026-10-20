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
export function createDailyQuiz(stamp=Date.now(),saved){
 const day=quizDay(stamp),items=dailyQuestions(day);let index=0,wrong=0,notice='';
 if(saved?.day===day&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<=QUIZ_LENGTH){index=saved.index;wrong=Number.isInteger(saved.wrong)&&saved.wrong>=0?saved.wrong:0;}
 return {day,items,get index(){return index;},get wrong(){return wrong;},get notice(){return notice;},get page(){return String(401+index);},
  snapshot(){return {day,index,wrong};},
  start(reset=false){if(reset||index===QUIZ_LENGTH){index=0;wrong=0;}notice='';return this.page;},
  answer(choice){if(index>=QUIZ_LENGTH||!Number.isInteger(choice)||choice<0||choice>3)return false;const correct=items[index].correct===choice;if(correct){index++;notice='CORRECT - KEEP GOING!';}else{index=0;wrong++;notice='WRONG! BACK TO QUESTION 1.';}return correct;}
 };
}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const quizHost='<img class="quiz-host" src="/bamber-host.png" alt="Bamber Boozler" draggable="false">';
export function renderQuiz(quiz,intro=false){
 const title='<div class="quiz-title">BOX BAFFLER!</div>';
 if(intro)return title+`<div class="quiz-welcome"><div><p class="tt-yellow">THE DAILY DOZEN</p><p>Bamber has 12 questions.</p><p>One wrong answer sends you back to the first question!</p></div>${quizHost}</div><div class="quiz-rules"><p>A fresh quiz every day at UK midnight.</p><p>Use the four coloured keys or tap an answer.</p><p>${questions.length} questions across 12 subjects.</p></div><button class="quiz-start tt-red" data-quiz-action="start">PRESS RED TO ${quiz.index>0&&quiz.index<12?'CONTINUE':'START'}</button>`;
 if(quiz.index===QUIZ_LENGTH)return title+`<div class="quiz-welcome"><div><p class="tt-yellow">YOU BEAT THE BOX!</p><p>All twelve answers correct.</p><p>Wrong answers this run: ${quiz.wrong}</p></div>${quizHost}</div><div class="quiz-rules"><p>Come back tomorrow for a fresh dozen.</p><p>Press red to play this quiz again.</p></div><button class="quiz-start tt-green" data-page="100">BACK TO THE MAIN INDEX 100</button>`;
 const q=quiz.items[quiz.index],colours=['red','green','yellow','blue'];
 return title+`<div class="quiz-status tt-yellow" role="status">${esc(quiz.notice||'CAN YOU GET ALL TWELVE RIGHT?')}</div><div class="quiz-question"><div><p class="tt-cyan">Q${quiz.index+1}/12 - ${esc(q.category.toUpperCase())}</p><p>${esc(q.question)}</p></div>${quizHost}</div><div class="quiz-answers">${q.answers.map((answer,i)=>`<button type="button" data-quiz-answer="${i}" class="quiz-answer"><span class="quiz-colour quiz-${colours[i]}" aria-hidden="true"></span><span>${String.fromCharCode(65+i)}. ${esc(answer)}</span></button>`).join('')}</div><div class="quiz-hint tt-cyan">ONE WRONG - BACK TO THE START!</div>`;
}
