import test from 'node:test';
import assert from 'node:assert/strict';
import { browserId } from '../public/browser-id.mjs';

test('plain HTTP LAN browsers can initialise viewer and catalogue IDs without randomUUID', () => {
  const lanCrypto = { getRandomValues(bytes) { for (let i = 0; i < bytes.length; i++) bytes[i] = i; return bytes; } };
  assert.equal(browserId(lanCrypto), '000102030405060708090a0b0c0d0e0f');
  assert.match(browserId(lanCrypto), /^[\w-]{16,80}$/);
  assert.equal(browserId({ randomUUID: () => 'secure-browser-uuid' }), 'secure-browser-uuid');
  assert.match(browserId(null), /^[\w-]{16,80}$/);
});
