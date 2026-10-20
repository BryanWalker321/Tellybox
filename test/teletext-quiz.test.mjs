import {buildTeletext} from '../public/teletext.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {questions} from '../public/quiz-questions.mjs';
import {createDailyQuiz,dailyQuestions,quizDay} from '../public/teletext-quiz.mjs';
test('question bank has 144 distinct four-choice questions balanced across 12 topics',()=>{
 assert.equal(questions.length,144);assert.equal(new Set(questions.map(q=>q.id)).size,144);assert.equal(new Set(questions.map(q=>q.question)).size,144);
 const topics=new Set(questions.map(q=>q.category));assert.equal(topics.size,12);for(const topic of topics)assert.equal(questions.filter(q=>q.category===topic).length,12);
 for(const q of questions){assert.equal(q.answers.length,4);assert.equal(new Set(q.answers.map(a=>a.toLowerCase())).size,4);assert.ok(q.answers.every(a=>a.length<=44));}
});
test('daily quiz is stable, mixed by subject and cycles through the full bank',()=>{
 const day='2026-10-21';assert.deepEqual(dailyQuestions(day),dailyQuestions(day));const q=dailyQuestions(day);assert.equal(q.length,12);assert.equal(new Set(q.map(q=>q.category)).size,12);for(const item of q)assert.ok(item.correct>=0&&item.correct<4);
 const ordinal=Math.floor(Date.parse(day)/86400000),start=Math.floor(ordinal/12)*12;const seen=new Set();for(let i=0;i<12;i++)for(const item of dailyQuestions(new Date((start+i)*86400000).toISOString().slice(0,10)))seen.add(item.id);assert.equal(seen.size,144);
 assert.notDeepEqual(q.map(q=>q.id),dailyQuestions('2026-10-22').map(q=>q.id));
});
test('wrong answers reset to question one, twelve correct reach page 413, and progress only restores on the same day',()=>{
 const stamp=Date.parse('2026-10-21T12:00:00Z'),q=createDailyQuiz(stamp);q.answer(q.items[0].correct);assert.equal(q.page,'402');q.answer((q.items[1].correct+1)%4);assert.equal(q.page,'401');assert.equal(q.wrong,1);assert.match(q.notice,/WRONG/);
 for(let i=0;i<12;i++)q.answer(q.items[i].correct);assert.equal(q.page,'413');assert.equal(q.answer(0),false);assert.equal(createDailyQuiz(stamp,q.snapshot()).index,12);assert.equal(createDailyQuiz(stamp+86400000,q.snapshot()).index,0);q.start(true);assert.equal(q.index,0);
 assert.equal(createDailyQuiz(stamp,{day:q.day,index:-1}).index,0);
});
test('quiz turns over at UK midnight including daylight-saving dates',()=>{
 assert.equal(quizDay(Date.parse('2026-07-01T22:59:59Z')),'2026-07-01');assert.equal(quizDay(Date.parse('2026-07-01T23:00:00Z')),'2026-07-02');assert.equal(quizDay(Date.parse('2026-12-01T23:59:59Z')),'2026-12-01');assert.equal(quizDay(Date.parse('2026-12-02T00:00:00Z')),'2026-12-02');
});

test('quiz heading shows the UK date and Bamber artwork',()=>{const page=buildTeletext({brand:{name:'Example'},channels:[],epoch:'2026-01-01'},'400',Date.parse('2026-10-21T12:00:00Z'));assert.match(page.html,/21\/10\/2026/);assert.match(page.html,/bamber-host.png/);});
