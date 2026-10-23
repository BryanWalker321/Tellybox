export function castSettings(env){
 const appId=/^[A-Fa-f0-9]{8}$/.test(env.CAST_APP_ID||'')?env.CAST_APP_ID.toUpperCase():'';
 const enabled=env.CAST_ENABLED==='1';
 return {enabled,ready:enabled&&Boolean(appId)&&env.IPTV_ENABLED!=='0',appId:enabled?appId:'',receiverPath:'/cast-receiver.html'};
}

export function viewingSettings(env){return {airplay:env.AIRPLAY_ENABLED!=='0',mirroring:env.MIRRORING_HELP_ENABLED!=='0',broadcast:env.IPTV_ENABLED!=='0'};}
