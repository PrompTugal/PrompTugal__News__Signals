// Tests for scripts/leak-scan.mjs's key rules (signals.b@PrompTugal.dinis, 19 Nov 2026; security@'s ruling, Website 1acd10498):
// a private key header fails everywhere, allowlisted files included; an OpenSSH public key fails outside
// ssh_signing.public_key in team/keys.json; a PEM public key in team/keys.json passes. Every key-shaped string here is made
// at run time from parts and random bytes, so this file does not match the scan itself and holds no real key.
// Usage: node scripts/test-leak-scan.mjs   (prints OK or the failing cases and exits 1)
import { randomBytes } from 'node:crypto';
import { scanText } from './leak-scan.mjs';

const D = '-'.repeat(5), b64 = n => randomBytes(n).toString('base64');
const pem = label => `${D}BEGIN ${label}${D}\n${b64(48)}\n${b64(48)}\n${D}END ${label}${D}`;
const sshPub = type => `${type} AAAA${b64(60).replace(/=+$/, '')} test@example.invalid`;
const SSH = ['ssh-' + 'ed25519', 'ssh-' + 'rsa', 'ecdsa-' + 'sha2-nistp256'];
const results = [];
const expect = (name, path, text, kind, want) => {
  const kinds = scanText(path, text).map(f => f.kind);
  const pass = want ? kinds.includes(kind) : !kinds.includes(kind);
  results.push({ name, pass, kinds });
};

// 1. private key headers: every kind, in a plain file, in team/keys.json and in an allowlisted file
for (const label of ['OPENSSH PRIVATE KEY', 'RSA PRIVATE KEY', 'EC PRIVATE KEY', 'DSA PRIVATE KEY', 'ENCRYPTED PRIVATE KEY', 'PRIVATE KEY'])
  for (const path of ['notes.md', 'team/keys.json', 'src/assets/obs/obs.json'])
    expect(`${label} in ${path} fails`, path, pem(label), 'private key block', true);

// 2. OpenSSH public keys: flagged outside the published field, allowed inside it
for (const t of SSH) {
  expect(`${t} public key in a plain file fails`, 'README.md', `key: ${sshPub(t)}`, 'ssh public key outside its published field', true);
  expect(`${t} public key in an allowlisted file fails`, 'src/assets/obs/obs.json', `"k": "${sshPub(t)}"`, 'ssh public key outside its published field', true);
  expect(`${t} public key in team/keys.json outside ssh_signing fails`, 'team/keys.json', `{ "keys": [ { "id": "x",\n  "public_key": "${sshPub(t)}" } ] }`, 'ssh public key outside its published field', true);
  expect(`${t} public key as ssh_signing.public_key passes`, 'team/keys.json', `{ "keys": [ { "id": "x", "ssh_signing": {\n  "public_key": "${sshPub(t)}"\n } } ] }`, 'ssh public key outside its published field', false);
}
expect('ssh_signing field in a file that is not team/keys fails', 'docs/keys.json', `{ "ssh_signing": {\n  "public_key": "${sshPub(SSH[0])}"\n } }`, 'ssh public key outside its published field', true);

// 3. the published PEM public key stays allowed in team/keys.json, and a private one beside it still fails
expect('PEM public key in team/keys.json passes', 'team/keys.json', `{ "pem": "${pem('PUBLIC KEY').replace(/\n/g, '\\n')}" }`, 'public key outside team/keys', false);
expect('PEM public key in a plain file fails', 'notes.md', pem('PUBLIC KEY'), 'public key outside team/keys', true);

const bad = results.filter(r => !r.pass);
for (const r of bad) console.error(`FAIL ${r.name}: found ${r.kinds.join(', ') || 'nothing'}`);
if (bad.length || results.length < 30) { console.error(`FAILED: ${bad.length} of ${results.length} cases`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
