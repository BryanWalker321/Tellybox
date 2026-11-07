import test from 'node:test';
import assert from 'node:assert/strict';
import {questions} from '../public/quiz-questions.mjs';
import {dailyQuestions,quizDay} from '../public/teletext-quiz.mjs';
test('1,200 distinct four-choice questions are balanced across twelve subjects',()=>{
 assert.equal(questions.length,1200);assert.equal(new Set(questions.map(q=>q.id)).size,1200);assert.equal(new Set(questions.map(q=>q.question)).size,1200);
 const topics=new Set(questions.map(q=>q.category));assert.equal(topics.size,12);for(const topic of topics)assert.equal(questions.filter(q=>q.category===topic).length,100);
 for(const q of questions){assert.equal(q.answers.length,4);assert.equal(new Set(q.answers.map(a=>a.toLowerCase())).size,4);assert.ok(q.answers.every(a=>a.length<=44),q.id);assert.ok(q.question.length<=155,q.id);}
});
test('daily selection is shared, stable and exhausts each subject before repeating',()=>{
 const day='2026-11-07';assert.deepEqual(dailyQuestions(day),dailyQuestions(day));const selected=dailyQuestions(day);assert.equal(selected.length,12);assert.equal(new Set(selected.map(q=>q.category)).size,12);for(const q of selected)assert.ok(q.correct>=0&&q.correct<4);
 const ordinal=Math.floor(Date.parse(day)/86400000),start=Math.floor(ordinal/100)*100,seen=new Set();for(let i=0;i<100;i++)for(const q of dailyQuestions(new Date((start+i)*86400000).toISOString().slice(0,10)))seen.add(q.id);assert.equal(seen.size,1200);
});
test('the daily quiz changes at UK midnight including daylight-saving dates',()=>{
 assert.equal(quizDay(Date.parse('2026-07-01T22:59:59Z')),'2026-07-01');assert.equal(quizDay(Date.parse('2026-07-01T23:00:00Z')),'2026-07-02');assert.equal(quizDay(Date.parse('2026-12-01T23:59:59Z')),'2026-12-01');assert.equal(quizDay(Date.parse('2026-12-02T00:00:00Z')),'2026-12-02');
});
