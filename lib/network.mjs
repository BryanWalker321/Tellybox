import {networkInterfaces} from 'node:os';
// Permit same-origin LAN requests while a local station retains its registered
// localhost Discord callback. Public deployments keep their canonical origin.
export function isLanAlias(req, canonical) {
  try {
    const configured = new URL(canonical), requested = new URL(`http://${req.headers.host}`);
    const ip = requested.hostname.split('.').map(Number);
    const privateIp = ip.length === 4 && ip.every(n => Number.isInteger(n) && n >= 0 && n <= 255)
      && (ip[0] === 10 || ip[0] === 192 && ip[1] === 168 || ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31);
    return ['localhost', '127.0.0.1', '[::1]'].includes(configured.hostname)
      && privateIp && req.headers.origin === requested.origin;
  } catch { return false; }
}
const loopback=name=>['localhost','127.0.0.1','::1','[::1]','::ffff:127.0.0.1'].includes(name);
const privateV4=ip=>/^192\.168\./.test(ip)||/^10\./.test(ip)||/^172\.(1[6-9]|2\d|3[01])\./.test(ip);

export function iptvNetworkInfo({base,listenHost,port,remoteAddress,iptvEnabled,interfaces=networkInterfaces()}) {
 const loopbackOnly=loopback(listenHost), localOrigin=loopback(new URL(base).hostname);
 // LAN hints are only needed by a viewer on the server itself. Public/LAN
 // viewers keep their existing reachable origin; no adapter inventory leaks.
 const lanBases=localOrigin&&loopback(remoteAddress)&&!loopbackOnly
  ? [...new Set(Object.values(interfaces).flat().filter(a=>a&&!a.internal&&(a.family==='IPv4'||a.family===4)&&privateV4(a.address)&&(['0.0.0.0','::'].includes(listenHost)||a.address===listenHost)).map(a=>a.address))]
    .sort((a,b)=>(a.startsWith('192.168.')?0:1)-(b.startsWith('192.168.')?0:1)||a.localeCompare(b))
    .map(ip=>`http://${ip}:${port}`)
  : [];
 return {base,loopbackOnly,iptvEnabled,iptvBase:localOrigin&&lanBases.length?lanBases[0]:base};
}
