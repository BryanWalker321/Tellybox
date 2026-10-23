export const CAST_NAMESPACE='urn:x-cast:uk.tellybox.station';
export const CAST_COMMANDS=new Set(['state','channel','next','previous','last','guide','watch','mute','fit','circle']);
export function castCommand(value,channels){
 if(!value||typeof value!=='object'||!CAST_COMMANDS.has(value.type))return null;
 if(value.type==='channel')return channels.some(c=>c.id===value.channel)?{type:'channel',channel:value.channel}:null;
 if(value.type==='fit')return ['off','stretched','centred'].includes(value.mode)?{type:'fit',mode:value.mode}:null;
 return {type:value.type};
}
export function adjacentChannel(channels,id,step){const i=channels.findIndex(c=>c.id===id);return channels[(Math.max(0,i)+step+channels.length)%channels.length];}
export function liveCastMedia(channel,brand,origin){
 if(!/^[a-z0-9-]+$/.test(channel.id))throw Error('Invalid channel');
 return {contentId:new URL(`/iptv/${channel.id}/index.m3u8`,origin).href,contentType:'application/x-mpegURL',streamType:'LIVE',metadata:{metadataType:0,title:channel.name,subtitle:brand.name},customData:{channel:channel.id,station:new URL(origin).origin},hlsSegmentFormat:'TS'};
}
