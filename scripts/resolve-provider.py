"""Resolve public provider URLs for a transient relay. Only transient probes; never retain programme media."""
import json,sys,urllib.parse,os,io,tempfile,re
from http.cookiejar import MozillaCookieJar
import yt_dlp
class Quiet:
 def debug(self,message):pass
 def warning(self,message):pass
 def error(self,message):pass
url=sys.argv[1]
description_only='--description' in sys.argv[2:]
host=urllib.parse.urlparse(url).hostname
if host not in ['youtube.com','www.youtube.com','youtu.be','www.dailymotion.com','dailymotion.com','dai.ly','vimeo.com','www.vimeo.com','player.vimeo.com']:
 raise SystemExit('Unsupported provider host')
if host in ['vimeo.com','www.vimeo.com','player.vimeo.com']:
 parsed=urllib.parse.urlparse(url)
 pattern=r'/video/\d{1,12}/?' if host=='player.vimeo.com' else r'/\d{1,12}(?:/[a-fA-F0-9]{8,64})?/?'
 hashes=urllib.parse.parse_qs(parsed.query,keep_blank_values=True).get('h',[])
 if parsed.scheme!='https' or parsed.username or parsed.password or parsed.port or not re.fullmatch(pattern,parsed.path) or any(not re.fullmatch(r'[a-fA-F0-9]{8,64}',h) for h in hashes):
  raise SystemExit('Unsupported Vimeo video URL')
 # Public video pages now use Vimeo's signed-in web client. Resolve their
 # public embedded player instead; retain unlisted privacy hashes verbatim.
 ident=re.search(r'/(?:video/)?(\d+)',parsed.path)[1]
 path_hash=parsed.path.strip('/').split('/')[-1] if host!='player.vimeo.com' and '/' in parsed.path.strip('/') else None
 privacy_hash=hashes[0] if hashes else path_hash
 url='https://player.vimeo.com/video/'+ident+(('?'+urllib.parse.urlencode({'h':privacy_hash})) if privacy_hash else '')


options={'quiet':True,'no_warnings':True,'skip_download':True,'noplaylist':True,'socket_timeout':15,'retries':1,'extractor_retries':1,'js_runtimes':{'node':{}},'logger':Quiet(),'format':'bv[height<=576][protocol=https][vcodec^=avc1]+ba[protocol=https][ext=m4a]/best[height<=576]/best','allow_unplayable_formats':False}
if host in ['youtube.com','www.youtube.com','youtu.be']:
 # YouTube can return metadata for HTTPS formats whose media requests require
 # additional attestation. Prefer the supported Safari HLS delivery path.
 # Keep the same signed-in session and let yt-dlp perform its normal requests.
 options['extractor_args']={'youtube':{'player_client':['default','web_safari']}}
 options['format']='best[height<=576][protocol^=m3u8][vcodec^=avc1]/best[height<=576][protocol^=m3u8]/bv[height<=576][protocol=https][vcodec^=avc1]+ba[protocol=https][ext=m4a]/best[height<=576]/best'
 # An optional private token provider supports per-video playback attestation.
 # Keep the existing delivery path for installations without that service.
 token_provider=os.environ.get('YOUTUBE_PO_TOKEN_BASE_URL','')
 if token_provider:
  parsed=urllib.parse.urlparse(token_provider)
  if parsed.scheme not in ['http','https'] or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
   raise SystemExit('Invalid private token-provider address')
  options['extractor_args']={'youtube':{'player_client':['default','mweb']},'youtubepot-bgutilhttp':{'base_url':[token_provider]}}
  options['format']='bv[height<=576][protocol=https][vcodec^=avc1]+ba[protocol=https][ext=m4a]/best[height<=576]/best'
  options['check_formats']=not description_only
  options['paths']={'temp':tempfile.gettempdir()}

try:
 if description_only:options['ignore_no_formats_error']=True
 # Read a snapshot in memory: yt-dlp must never rewrite the owner's stored
 # session, or recreate it after the owner disconnects authentication.
 if host in ['youtube.com','www.youtube.com','youtu.be'] and os.environ.get('YOUTUBE_COOKIE_FILE'):
  with open(os.environ['YOUTUBE_COOKIE_FILE'],encoding='utf-8') as saved: cookie_text=saved.read(262145)
  if len(cookie_text)>262144:raise ValueError('Cookie file too large')
  jar=MozillaCookieJar()
  jar._really_load(io.StringIO(cookie_text),'private-youtube-session',True,False)
  if any(not (c.domain.lstrip('.').lower()=='youtube.com' or c.domain.lstrip('.').lower().endswith('.youtube.com')) for c in jar):raise ValueError('YouTube-only cookies required')
  options['cookiefile']=None
  # YoutubeDL's cookiejar property otherwise creates a jar from disk.
 else:jar=None
 with yt_dlp.YoutubeDL(options) as resolver:
  if jar is not None:
   for cookie in jar:resolver.cookiejar.set_cookie(cookie)
  info=resolver.extract_info(url,download=False,process=False) if description_only else resolver.extract_info(url,download=False)
 if info.get('is_live') or info.get('age_limit',0)>=18 or info.get('availability') in ['private','premium_only','subscriber_only','needs_auth']:
  raise ValueError('This resolver accepts public, unrestricted on-demand videos only.')
 if description_only:
  print(json.dumps({'description':info.get('description') or ''}));sys.exit(0)
 formats=info.get('requested_formats') or [info]
 streams=[]
 for f in formats:
  if f.get('has_drm'):raise ValueError('DRM media is not supported.')
  stream=f.get('url','')
  if urllib.parse.urlparse(stream).scheme not in ['https','http']:raise ValueError('No public HTTP media stream found.')
  headers={k:v for k,v in f.get('http_headers',{}).items() if k.lower() in ['user-agent','referer','origin'] and '\r' not in str(v) and '\n' not in str(v)}
  streams.append({'url':stream,'headers':headers,'video':f.get('vcodec')!='none','audio':f.get('acodec')!='none'})
 print(json.dumps({'id':info['id'],'title':info['title'],'duration':info.get('duration'),'streams':streams,'metadata':{k:info.get(k) for k in ['description','channel','channel_id','availability','age_limit','playable_in_embed','upload_date','release_date','release_year']}}))
except Exception as error:
 message=str(error).lower()
 code='provider_unavailable'
 if any(x in message for x in ['sign in to confirm','not a bot','confirm you’re not','confirm you\'re not']):code='auth_challenge'
 elif '429' in message or 'too many requests' in message:code='rate_limited'
 elif any(x in message for x in ['private video','video unavailable','removed by','has been removed','not available anymore']):code='video_unavailable'
 elif any(x in message for x in ['not available in your country','geo-restricted']):code='geo_restricted'
 elif any(x in message for x in ['requested format is not available','no video formats found']):code='format_unavailable'
 elif 'public, unrestricted' in message or 'drm' in message:code='restricted_media'
 print(json.dumps({'error':'The provider could not supply a playable public stream. Check provider availability and the optional YouTube session. Restricted or DRM media is not supported.','code':code}));sys.exit(1)
