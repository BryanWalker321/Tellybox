import {wrap} from './teletext-pages.mjs';
import {beachRows} from './teletext-art.mjs';
const rows=(s,colour='white',extra={})=>wrap(s).map(text=>({text,colour,...extra}));
export function holidayPage(page,data,stamp,requested=0){
 const n=Number(page);if(n<500||n>510)return null;
 const feed=data?.feeds?.holidays,valid=feed?.expiresAt&&stamp<Date.parse(feed.expiresAt),items=valid?feed.items:[];
 let heading='TELLYTEXT HOLIDAYS',content=[];
 if(n===500)content=[...rows('YOUR NEXT ESCAPE STARTS HERE','yellow'),...beachRows(),...rows('REAL OFFERS FROM HAYS TRAVEL','cyan'),...rows('HOLIDAY OFFERS - PAGE 501','yellow',{page:'501'}),...rows('From prices, subject to availability.'),...rows('Check all details with the travel agent.')];
 else if(n===501){heading='HOLIDAY OFFERS';content=[...rows('HAYS TRAVEL - LAST MINUTE','cyan')];items.forEach((o,i)=>content.push(...rows((502+i)+' '+o.title,'yellow',{page:String(502+i)}),...rows('FROM '+o.price,'green',{page:String(502+i)})));}
 else{const o=items[n-502];heading='HOLIDAY OFFER';if(o)content=[...rows(o.title,'yellow'),...rows('FROM '+o.price,'green'),...o.fields.flatMap(f=>rows(f)),...rows(o.fees||'Confirm occupancy and local fees with agent.'),...rows('Selected dates. Confirm departure date, airport, total price and availability.'),...rows('HAYS TRAVEL','cyan',{sourceUrl:o.url}),...rows('CHECKED '+o.checkedAt,'cyan'),...rows('HAYSTRAVEL.CO.UK','cyan',{sourceUrl:o.url}),...rows('Tellytext is not the booking agent.')];}
 if(!content.length||n===501&&!items.length)content.push(...rows('OFFERS TEMPORARILY UNAVAILABLE','yellow'),...rows('Fresh offers will return automatically.'));
 if(feed?.stale&&items.length)content.unshift(...rows('CACHED OFFER - RECHECK PRICE','yellow'));
 const subpages=Math.max(1,Math.ceil(content.length/17)),subpage=Math.max(0,Math.min(subpages-1,Number(requested)||0));return {page,heading,rows:content.slice(subpage*17,(subpage+1)*17),subpage,subpages,links:[{label:'Holidays',page:'500'},{label:'Previous',page:String(Math.max(500,n-1))},{label:'Next',page:String(Math.min(510,n+1))},{label:'Offers',page:'501'}]};
}
