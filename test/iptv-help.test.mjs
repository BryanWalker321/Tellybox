import test from 'node:test';
import assert from 'node:assert/strict';
import {iptvNetworkInfo} from '../lib/network.mjs';
import {iptvAddresses} from '../public/iptv-help.mjs';
const interfaces={Ethernet:[{family:'IPv4',address:'192.168.0.194',internal:false}],VPN:[{family:'IPv4',address:'10.0.0.2',internal:false}],Loopback:[{family:'IPv4',address:'127.0.0.1',internal:true}]};

test('IPTV help uses a reachable LAN origin for a localhost viewer when the station listens on the network',()=>{
 const info=iptvNetworkInfo({base:'http://127.0.0.1:4173',listenHost:'0.0.0.0',port:4173,remoteAddress:'::ffff:127.0.0.1',iptvEnabled:true,interfaces});
 assert.deepEqual(iptvAddresses(info.iptvBase),{base:'http://192.168.0.194:4173',playlist:'http://192.168.0.194:4173/channels.m3u',guide:'http://192.168.0.194:4173/guide.xml',localOnly:false});
 assert.equal(info.base,'http://127.0.0.1:4173','Discord/owner canonical address stays untouched');
 const local=iptvNetworkInfo({base:'http://127.0.0.1:4173',listenHost:'127.0.0.1',port:4173,remoteAddress:'127.0.0.1',iptvEnabled:true,interfaces});
 assert.ok(iptvAddresses(local.iptvBase).localOnly);
});
test('IPTV help preserves the actual LAN or configured public origin without exposing adapter details',()=>{
 for(const base of ['http://192.168.10.50:9000','https://tv.example.co.uk']){
  const info=iptvNetworkInfo({base,listenHost:'0.0.0.0',port:4173,remoteAddress:'203.0.113.10',iptvEnabled:true,interfaces});
  assert.equal(info.iptvBase,base);assert.equal(iptvAddresses(info.iptvBase).playlist,base+'/channels.m3u');
  assert.ok(!JSON.stringify(info).includes('10.0.0.2'));
 }
 assert.throws(()=>iptvAddresses('javascript:alert(1)'));
 assert.throws(()=>iptvAddresses('https://name:secret@example.com'));
});
