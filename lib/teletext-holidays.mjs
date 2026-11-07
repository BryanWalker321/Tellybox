export const holidaySource='https://www.haystravel.co.uk/holidays/last-minute-holidays/';
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
// Read only factual offer fields, never hotel descriptions or marketing copy.
export function parseHaysOffers(html,stamp){
 if(typeof html!=='string'||html.length>2000000)throw Error('Invalid holiday response');
 const items=[];
 for(const card of html.split(/<div class="splide__slide[^"\n]*js-link-card">/).slice(1)){
  const title=clean(card.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]),url=card.match(/class="[^"]*js-link-card-primary-href" href="([^"]+)"/)?.[1];
  const price=clean(card.match(/<p class="[^"]*text-4xl[^>]*>([\s\S]*?)<\/p>/)?.[1]);
  const fields=[...card.matchAll(/<p><span[^>]*>[\s\S]*?<\/span>([\s\S]*?)<\/p>/g)].map(m=>clean(m[1]));
  const fees=clean(card.match(/<p class="[^"]*text-xs[^>]*>([\s\S]*?)<\/p>/)?.[1]);
  if(!title||!/^£[\d,]+(?:\.\d{2})?\s*pp$/i.test(price)||!url?.startsWith('/destinations/')||!fields.some(f=>/\d+ Nights?$/i.test(f)))continue;
  items.push({title,price,fields:fields.slice(0,4),fees,url:new URL(url,'https://www.haystravel.co.uk').href,checkedAt:new Date(stamp).toISOString()});
  if(items.length===9)break;
 }
 if(!items.length)throw Error('No valid holiday offers');
 return {items,expiresAt:new Date(stamp+6*3600000).toISOString()};
}
