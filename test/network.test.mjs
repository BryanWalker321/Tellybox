import test from 'node:test';
import assert from 'node:assert/strict';
import { isLanAlias } from '../lib/network.mjs';
test('local station accepts matching private LAN origins and rejects cross-origin or public aliases', () => {
  const req = { headers: { host: '192.168.0.194:4173', origin: 'http://192.168.0.194:4173' } };
  assert.equal(isLanAlias(req, 'http://127.0.0.1:4173'), true);
  assert.equal(isLanAlias(req, 'https://tv.example.com'), false);
  assert.equal(isLanAlias({ headers: { ...req.headers, origin: 'https://evil.example' } }, 'http://127.0.0.1:4173'), false);
  assert.equal(isLanAlias({ headers: { host: 'evil.example', origin: 'http://evil.example' } }, 'http://127.0.0.1:4173'), false);
});
