// Player menus vary by version. These guides use ordinary M3U/XMLTV inputs;
// this station does not supply Xtream Codes or Stalker portal credentials.
export const iptvPlayers = [
 {id:'kodi',name:'Kodi',devices:'PC, media centre & TV',help:'https://kodi.wiki/view/Add-on:IPTV_Simple_Client',steps:[
  'Open <strong>Settings → Add-ons → Install from repository → Kodi Add-on repository → PVR clients</strong>. Install <strong>IPTV Simple Client</strong>.',
  'Open its <strong>Configure</strong> screen. If shown, choose <strong>Add add-on configuration</strong> and name your station.',
  'Under <strong>General / General Channel Setup</strong>, choose <strong>Remote path (Internet address)</strong>. Paste the <strong>Live channel playlist</strong> address below into <strong>M3U playlist URL</strong>.',
  'Under <strong>EPG Settings</strong>, choose <strong>Remote path</strong> and paste the <strong>Television programme guide</strong> address into the <strong>XMLTV URL</strong>. Leave time shift at <strong>0</strong>.',
  'Save, enable the client and restart Kodi. Open <strong>TV → Channels</strong> or <strong>TV → Guide</strong> to watch.'
 ]},
 {id:'tivimate',name:'TiviMate',devices:'Android TV & Fire TV',help:'https://tivimate.com/',steps:[
  'Open <strong>Add playlist</strong>, or go to <strong>Settings → Playlists → Add playlist</strong> if you already have a playlist.',
  'Choose <strong>M3U playlist</strong>, then <strong>Enter URL</strong>. Paste the <strong>Live channel playlist</strong> address below.',
  'Continue, give the playlist your station’s name and finish adding it.',
  'If prompted for an EPG address, paste the <strong>Television programme guide</strong> address below. Otherwise open <strong>Settings → EPG → EPG sources → Add source</strong>, add that address, then assign it to this playlist under <strong>Settings → Playlists → your playlist → EPG sources</strong>.',
  'Update the EPG, return to the channel guide and select a channel.'
 ]},
 {id:'smarters',name:'IPTV Smarters',devices:'M3U-capable editions',steps:[
  'Choose <strong>Add user</strong> or <strong>Add playlist</strong>, then the option called <strong>Load your playlist / File / URL</strong> or <strong>M3U playlist</strong>.',
  'Select <strong>URL</strong>, enter a name for this station and paste the <strong>Live channel playlist</strong> address below into the playlist URL field.',
  'Save the playlist and open <strong>Live TV</strong> to choose a channel.',
  'If your edition offers a separate <strong>EPG / XMLTV URL</strong> setting, add the <strong>Television programme guide</strong> address below and refresh the guide.'
 ],note:'Smarters editions differ. These steps require an edition with M3U URL support. If yours only offers a server address, username and password, use another M3U-capable player; this station does not provide Xtream Codes credentials.'},
 {id:'televizo',name:'Televizo',devices:'Android phone, tablet & TV',help:'https://televizo.net/',steps:[
  'Open <strong>Create playlist</strong> or the <strong>+</strong> button, and choose a new <strong>M3U playlist</strong>.',
  'Name the playlist and paste the <strong>Live channel playlist</strong> address below into its URL field. Save it and wait for the channels to load.',
  'The playlist includes its guide address. If listings do not appear automatically, open the playlist’s <strong>EPG / programme guide</strong> settings and add the <strong>Television programme guide</strong> address below.',
  'Refresh the playlist and guide, then select a live channel.'
 ]},
 {id:'iptvx',name:'IPTVX',devices:'Apple TV, iPhone, iPad & Mac',help:'https://iptvx.app/features/index.html',steps:[
  'Open the <strong>playlist manager</strong> and add a new playlist. Choose <strong>M3U</strong> as the source type.',
  'Give it a name and paste the <strong>Live channel playlist</strong> address below into the M3U URL field.',
  'In the playlist’s <strong>EPG / guide</strong> settings, enter the <strong>Television programme guide</strong> address below if it has not been detected automatically. Leave EPG time shift at <strong>0</strong>.',
  'Save and reload the playlist and EPG. Open <strong>Live TV</strong> or <strong>TV Guide</strong> and select a channel.'
 ]},
 {id:'vlc',name:'VLC',devices:'Desktop & mobile',help:'https://docs.videolan.me/vlc-user/desktop/3.0/en/basic/media.html',steps:[
  'On Windows or Linux, choose <strong>Media → Open Network Stream</strong>. On macOS, choose <strong>File → Open Network</strong>. On mobile, use <strong>Network stream / Open network stream</strong>.',
  'Paste the <strong>Live channel playlist</strong> address below and press <strong>Play / Open</strong>.',
  'Open VLC’s <strong>Playlist</strong> view to see the channels, then select the one you want to watch.'
 ],note:'VLC is useful for watching channels, but does not offer the same XMLTV programme-guide setup as a dedicated IPTV app. Use this website’s TV guide for listings, or choose another player above.'},
 {id:'other',name:'Other player',devices:'Smart TVs & other apps',steps:[
  'Find <strong>Add playlist</strong>, <strong>M3U URL</strong> or <strong>Remote playlist</strong> in your app. Choose a URL-based M3U source.',
  'Paste the <strong>Live channel playlist</strong> address below, give the station a name and save.',
  'If the app supports <strong>EPG / XMLTV</strong>, add the <strong>Television programme guide</strong> address below and associate it with this playlist. Leave time shift at <strong>0</strong>.',
  'Refresh the channels and guide, then select a channel. If your app cannot accept an M3U URL, choose one of the players above.'
 ]}
];
