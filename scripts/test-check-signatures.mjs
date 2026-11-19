// Tests for scripts/check-signatures.mjs (signals.b@PrompTugal.dinis, 19 Nov 2026; after data.b@'s
// PrompTugal__News__Data scripts/test-check-signatures.mjs). Runs in a temporary repository with fresh test keys made
// here (never the real signing key), with gpg.ssh.program set to ssh-keygen locally (the machine's global git config
// points at the environment's own signer, which a test must not inherit), and asserts the reason for every failure.
// Usage: node scripts/test-check-signatures.mjs   (prints OK or the failing cases and exits 1). Needs git and ssh-keygen.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const CHECK = join(dirname(fileURLToPath(import.meta.url)), 'check-signatures.mjs');
// no inherited repository or config from the caller's environment
const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|CONFIG|OBJECT_DIRECTORY|ALTERNATE|NAMESPACE|CEILING)/.test(k)));
const dir = mkdtempSync(join(tmpdir(), 'sigtest-'));
const keys = join(dir, 'keys'); mkdirSync(keys);
const repo = join(dir, 'repo'); mkdirSync(repo);
const AGENT = 'tester.b@PrompTugal.dinis', SESSION = 'session_TESTTESTTESTTEST01';
const URL = `https://claude.ai/code/${SESSION}`;
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: ENV, ...opts });
const git = (...a) => run('git', a);
const key = name => { const f = join(keys, name); execFileSync('ssh-keygen', ['-q', '-t', 'ecdsa', '-b', '256', '-N', '', '-C', name, '-f', f]); return { f, pem: execFileSync('ssh-keygen', ['-e', '-m', 'PKCS8', '-f', f + '.pub'], { encoding: 'utf8' }) }; };
const keysJson = list => JSON.stringify({ keys: list.map((k, i) => ({ id: `t${i}`, agent: AGENT, session: SESSION, git_signing: { pem: k.pem } })) }, null, 1) + '\n';
const msg = (agent = AGENT, session = URL) => `test\n\nAgent: ${agent}\nClaude-Session: ${session}\n`;
const commit = ({ signWith, agent, session, allowEmpty = true, env = {} } = {}) => {
  const args = ['-c', 'gpg.format=ssh', '-c', 'gpg.ssh.program=ssh-keygen'];
  if (signWith) args.push('-c', `user.signingkey=${signWith.f}`);
  args.push('commit', '-q', signWith ? '-S' : '--no-gpg-sign', '-m', msg(agent, session));
  if (allowEmpty) args.push('--allow-empty');
  run('git', args, { env: { ...ENV, ...env } });
  return git('rev-parse', 'HEAD').trim();
};
const check = (from) => { const r = spawnSync(process.execPath, [join(repo, 'scripts/check-signatures.mjs'), from, 'HEAD'], { cwd: repo, encoding: 'utf8', env: ENV }); return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') }; };

const results = [];
const expect = (name, res, ok, reason) => {
  const pass = res.ok === ok && (!reason || reason.test(res.out));
  results.push({ name, pass, out: res.out.trim().split('\n').slice(-2).join(' | ') });
};
try {
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'test'); git('config', 'user.email', 'test@example.invalid');
  git('config', 'gpg.ssh.program', 'ssh-keygen'); git('config', 'gpg.format', 'ssh'); git('config', 'commit.gpgsign', 'false');
  const A = key('a'), B = key('b');
  // the bootstrap: the commit that adds the check publishes the first key and is signed by it
  mkdirSync(join(repo, 'scripts')); mkdirSync(join(repo, 'team'));
  copyFileSync(CHECK, join(repo, 'scripts/check-signatures.mjs'));
  writeFileSync(join(repo, 'team/keys.json'), keysJson([A]));
  git('add', '-A'); const base = commit({ signWith: A, allowEmpty: false });
  expect('bootstrap commit, signed by the key it publishes', check(`${base}^`), true, /^OK \(1 commits checked/);
  const branch = name => { git('checkout', '-q', '-B', name, base); };

  branch('good'); commit({ signWith: A });
  expect('signed, right Agent and full session URL', check(base), true, /^OK \(1 commits checked/);

  branch('unsigned'); commit({});
  expect('unsigned', check(base), false, /not signed by a key in team\/keys\.json \(status N\)/);

  branch('agent'); commit({ signWith: A, agent: 'someone.else@PrompTugal.dinis' });
  expect('wrong Agent:', check(base), false, /but its Agent: is someone\.else@PrompTugal\.dinis/);

  branch('session'); commit({ signWith: A, session: 'https://claude.ai/code/session_OTHEROTHEROTHER1' });
  expect('wrong Claude-Session:', check(base), false, /Claude-Session: https:\/\/claude\.ai\/code\/session_OTHER.* not https:\/\/claude\.ai\/code\/session_TEST/);

  branch('bare'); commit({ signWith: A, session: SESSION });
  expect('bare session id, not the full URL', check(base), false, new RegExp(`Claude-Session: ${SESSION}, not ${URL.replace(/[./]/g, '\\$&')}`));

  branch('suffix'); commit({ signWith: A, session: URL + '?x' });
  expect('session URL with a suffix', check(base), false, /Claude-Session: .*\?x, not /);

  branch('foreign'); commit({ signWith: B });
  expect('signed by an unpublished key', check(base), false, /not signed by a key in team\/keys\.json \(status [^G]/);

  branch('selfadd'); writeFileSync(join(repo, 'team/keys.json'), keysJson([A, B])); git('add', '-A'); commit({ signWith: B, allowEmpty: false });
  expect('a commit that adds its own key', check(base), false, /not signed by a key in team\/keys\.json/);

  branch('botname'); commit({ env: { GIT_COMMITTER_NAME: 'github-actions[bot]', GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com' } });
  expect('unsigned with a forged CI committer', check(base), false, /not signed by a key in team\/keys\.json \(status N\)/);

  branch('merge'); git('checkout', '-q', '-b', 'side'); commit({ signWith: A }); git('checkout', '-q', 'merge');
  run('git', ['-c', 'gpg.ssh.program=ssh-keygen', 'merge', '-q', '--no-ff', '--no-gpg-sign', '-m', msg(), 'side']);
  expect('unsigned merge of a signed side commit', check(base), false, /not signed by a key in team\/keys\.json \(status N\)/);

  branch('range'); commit({ signWith: A }); commit({}); commit({ signWith: A });
  expect('one bad commit refuses the whole range', check(base), false, /FAILED: 1 problem\(s\); the whole range is refused/);
} catch (e) {
  results.push({ name: 'setup', pass: false, out: String(e.stderr || e.message).slice(0, 300) });
} finally { rmSync(dir, { recursive: true, force: true }); }

const bad = results.filter(r => !r.pass);
for (const r of bad) console.error(`FAIL ${r.name}: ${r.out}`);
if (bad.length || results.length < 12) { console.error(`FAILED: ${bad.length} of ${results.length} cases`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
