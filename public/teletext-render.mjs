import {colourNames} from './teletext-pages.mjs';
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderFrame(brand,heading,marker,body){const title=String(brand.name||'Tellybox').toUpperCase();return `<div class="tt-banner"><span class="tt-box-mark" aria-hidden="true">T B</span><strong style="font-size:${Math.min(12,210/Math.max(title.length,1))}cqw">${escape(title)}</strong></div><div class="tt-strap">YOUR WORLD AT THE TOUCH OF A BUTTON</div><div class="tt-section"><strong>${escape(heading)}</strong><span>${marker}</span></div><div class="tt-page-body">${body}</div><div class="tt-slogan">${escape((title+": THERE'S ALWAYS SOMETHING ON").slice(0,40))}</div>`;}
export function renderTeletextModel(brand,model){return renderFrame(brand,model.heading,`${model.subpage+1}/${model.subpages}`,renderSpecial(model));}
export function renderSpecial(model){
 if(model.page.startsWith('4')){
  const host='<img class="quiz-host" src="/bamber-host.png" alt="Bamber Boozler" draggable="false">';
  let body='<div class="quiz-title">BOX BAFFLER!</div>';
  if(model.question){const q=model.question;body+=`<div class="quiz-status tt-yellow">CHOOSE A COLOUR TO TURN THE PAGE</div><div class="quiz-question"><div><p class="tt-cyan">Q${model.questionIndex+1}/12 - ${escape(q.category.toUpperCase())}</p><p>${escape(q.question)}</p></div>${host}</div><div class="quiz-answers">${q.answers.map((a,i)=>`<button type="button" class="quiz-answer" data-page="${model.links[i].page}"><span class="quiz-colour quiz-${colourNames[i]}"></span><span>${String.fromCharCode(65+i)}. ${escape(a)}</span></button>`).join('')}</div><div class="quiz-hint tt-cyan">ONE WRONG - BACK TO THE START!</div>`;}
  else body+=`<div class="quiz-welcome"><div>${model.rows.map(r=>`<p class="tt-${r.colour||'white'}">${escape(r.text)}</p>`).join('')}</div>${host}</div><div class="quiz-rules"><p>Use the coloured keys or type a page.</p><p>Same daily quiz on the web and your TV.</p></div><button type="button" class="quiz-start tt-red" data-page="401">PRESS RED TO ${model.page==='400'?'START':'PLAY AGAIN'}</button>`;
  return body;
 }
 return model.rows.map(r=>r.page?`<button type="button" class="tt-feed-story tt-${r.colour||'white'}" data-page="${r.page}"><div class="tt-row">${escape(r.text||' ')}</div></button>`:r.sourceUrl&&/^https:\/\//.test(r.sourceUrl)?`<a class="tt-feed-story tt-${r.colour||'white'}" href="${escape(r.sourceUrl)}" target="_blank" rel="noopener noreferrer"><div class="tt-row">${escape(r.text||' ')}</div></a>`:`<div class="tt-row tt-${r.colour||'white'}">${escape(r.text||' ')}</div>`).join('');
}
