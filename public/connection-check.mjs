export async function checkConnection({origin=location.origin,expected='',fetchImpl=fetch}={}) {
 const results=[];
 async function check(label,url,verify){try{const response=await fetchImpl(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('HTTP '+response.status);if(!await verify(response))throw Error('Unexpected response');results.push({label,passed:true});}catch{results.push({label,passed:false});}}
 await check('This Tellybox installation',origin+'/api/connection-identity',async r=>{const value=await r.json();return !!value.instance&&(!expected||value.instance===expected);});
 await check('Channel catalogue',origin+'/api/catalogue',async r=>{const value=await r.json();return !!value.brand?.name&&Array.isArray(value.channels);});
 await check('IPTV playlist uses this address',origin+'/channels.m3u',async r=>{const text=await r.text();const urls=text.split(/\r?\n/).filter(s=>s&&!s.startsWith('#'));return text.startsWith('#EXTM3U')&&urls.length>0&&urls.every(s=>{try{return new URL(s).origin===origin;}catch{return false;}});});
 await check('Programme guide',origin+'/guide.xml',async r=>{const text=await r.text();return /<tv[\s>]/.test(text)&&/<\/tv>/.test(text);});
 return results;
}
export function showResults(element,results){element.replaceChildren();for(const r of results){const item=document.createElement('li');item.textContent=(r.passed?'✓ ':'✗ ')+r.label;element.append(item);}}
if(typeof document!=='undefined'&&document.getElementById('connection-run')){
 const button=document.getElementById('connection-run'),status=document.getElementById('connection-status');
 button.addEventListener('click',async()=>{button.disabled=true;status.textContent='Checking this connection…';try{const results=await checkConnection({expected:new URLSearchParams(location.hash.slice(1)).get('station')||''});showResults(document.getElementById('connection-results'),results);status.textContent=results.every(r=>r.passed)?'This station is reachable from this device.':'Some checks failed. Check the station address, DNS, firewall and hosting guide.';}finally{button.disabled=false;}});
}
