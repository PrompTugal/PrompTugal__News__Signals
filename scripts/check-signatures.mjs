// Every commit is signed by its agent's published key (Dinis, 19 Nov 2026, PrompTugal__News__Website
// board/guidance/2026-11-19-signed-commits-paid-search-and-free-embeds.md, section 2; signals.b@PrompTugal.dinis).
// Usage: node scripts/check-signatures.mjs <before> <after>   (the pushed range, before..after)
// For every commit in the range (merges and side branches included: security@'s ruling of 19 Nov 2026 about 01:30 UTC), from the commit that added this file on (history is never rewritten), it
// fails unless: the commit has a good SSH signature by a key in team/keys.json (entries with git_signing); the key's
// agent is the commit's Agent: trailer; and the commit's Claude-Session: trailer names the session recorded with that
// key. Each commit is checked against team/keys.json as it stood in its parent, so no commit can authorise its own key;
// only the commit that added this file is checked against its own keys (the bootstrap: it publishes the first key).
// Commits made by CI itself would be exempt by name (CI_COMMITTERS); this repository's CI makes none.
// Needs ssh-keygen (OpenSSH). Prints OK or lists each failing commit and exits 1.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// None: this repository's CI makes no commits, and a committer address can be set by anyone (AppSec post-review, 19 Nov 2026).
const CI_COMMITTERS = new Set([]);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return null; } };
const lines = s => (s ? s.split('\n').filter(Boolean) : []);
const [beforeArg, afterArg] = process.argv.slice(2);
const after = afterArg || 'HEAD';
if (!tryGit('rev-parse', '--verify', '--quiet', `${after}^{commit}`)) { console.error(`check-signatures: unknown commit ${after}`); process.exit(1); }

// The one trusted base: the commit that added this check and published the first key (videos.b@'s pre-review, passed on by
// conductor.b@ on 19 Nov 2026, 14:01 UTC). It is recorded here, never worked out from the pushed history, so a pushed orphan
// that adds its own copy of this file cannot become the base. A test repository names its own base in SIGNATURES_TRUSTED_BASE.
const TRUSTED_BASE = process.env.SIGNATURES_TRUSTED_BASE || '01016393c727abca34e90fdec9cb279f438d2df4';
if (!/^[0-9a-f]{40}$/.test(TRUSTED_BASE)) { console.error('check-signatures: the trusted base is not a full commit id'); process.exit(1); }
const isAncestor = (a, b) => { try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' }); return true; } catch { return false; } };
if (!tryGit('rev-parse', '--verify', '--quiet', `${TRUSTED_BASE}^{commit}`) || !isAncestor(TRUSTED_BASE, after)) { console.error(`check-signatures: ${after} does not descend from the trusted base ${TRUSTED_BASE.slice(0, 7)}`); process.exit(1); }
const first = TRUSTED_BASE;
const descendants = new Set([first, ...lines(git('rev-list', '--ancestry-path', `${first}..${after}`))]);

// the allowed signers, from the published keys as they stood before each commit (the PEM form is turned back into an SSH key here)
const tmp = mkdtempSync(join(tmpdir(), 'signers-'));
const cache = new Map();
function signersAt(rev) {
  const blob = tryGit('rev-parse', '--verify', '--quiet', `${rev}:team/keys.json`);
  if (!blob) return { keys: [], file: null };
  if (cache.has(blob)) return cache.get(blob);
  const keys = [];
  const entries = (JSON.parse(git('show', blob)).keys || []).filter(k => k.git_signing && !k.superseded);
  for (const k of entries) {
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*@[A-Za-z0-9.-]+$/.test(k.agent || '') || !/^session_[A-Za-z0-9]{10,64}$/.test(k.session || '')) throw new Error(`team/keys.json: entry ${k.id} needs an agent and a session`);
    const n = keys.length, pemFile = join(tmp, `${blob}-${n}.pem`); writeFileSync(pemFile, String(k.git_signing.pem));
    const ssh = execFileSync('ssh-keygen', ['-i', '-m', 'PKCS8', '-f', pemFile], { encoding: 'utf8' }).trim().split(' ').slice(0, 2).join(' ');
    const pubFile = join(tmp, `${blob}-${n}.pub`); writeFileSync(pubFile, ssh + '\n');
    keys.push({ agent: k.agent, session: k.session, ssh, fp: execFileSync('ssh-keygen', ['-lf', pubFile], { encoding: 'utf8' }).split(' ')[1] });
  }
  const file = join(tmp, `${blob}.signers`); writeFileSync(file, keys.map(k => `${k.agent} namespaces="git" ${k.ssh}`).join('\n') + '\n');
  const out = { keys, file }; cache.set(blob, out); return out;
}
try {
  const zero = /^0+$/;
  const before = beforeArg && !zero.test(beforeArg) && tryGit('rev-parse', '--verify', '--quiet', `${beforeArg}^{commit}`);
  const added = lines(git('rev-list', ...(before ? [`${before}..${after}`] : [after])));   // every commit, merges included
  const errors = []; let checked = 0, exempt = 0;
  for (const c of added) {
    // history from before the check is not checked; anything else must descend from the trusted base, and no commit but the
    // base may have no parent (an orphan would trust the keys in its own tree)
    if (c !== first && !git('log', '-1', '--format=%P', c)) { errors.push(`${c.slice(0, 7)}: has no parent (an orphan commit)`); continue; }
    if (!descendants.has(c)) { if (isAncestor(c, first)) continue; errors.push(`${c.slice(0, 7)}: does not descend from the trusted base (a side history)`); continue; }
    const committer = git('log', '-1', '--format=%ce', c);
    if (CI_COMMITTERS.has(committer)) { exempt++; continue; }
    checked++;
    const { keys, file: signers } = signersAt(c === first ? c : `${c}^`);
    if (!signers || !keys.length) { errors.push(`${c.slice(0, 7)}: no signing key was published before this commit`); continue; }
    const [status, fp] = lines(git('-c', `gpg.ssh.allowedSignersFile=${signers}`, '-c', 'gpg.ssh.program=ssh-keygen', 'log', '-1', '--format=%G?%n%GF', c)).concat(['', '']);
    const agent = lines(git('log', '-1', '--format=%(trailers:key=Agent,valueonly)', c)).map(s => s.trim());
    const sessions = lines(git('log', '-1', '--format=%(trailers:key=Claude-Session,valueonly)', c)).map(s => s.trim());
    const subject = git('log', '-1', '--format=%s', c).slice(0, 70);
    const key = keys.find(k => k.fp === fp);
    if (status !== 'G' || !key) { errors.push(`${c.slice(0, 7)} ${subject}: not signed by a key in team/keys.json (status ${status || 'none'})`); continue; }
    if (agent.length !== 1 || agent[0].toLowerCase() !== key.agent.toLowerCase()) errors.push(`${c.slice(0, 7)} ${subject}: signed by ${key.agent}'s key but its Agent: is ${agent.join(', ') || 'missing'}`);
    const want = `https://claude.ai/code/${key.session}`;   // the full session URL, compared exactly
    if (sessions.length !== 1 || sessions[0] !== want) errors.push(`${c.slice(0, 7)} ${subject}: Claude-Session: ${sessions.join(', ') || 'missing'}, not ${want} (the session recorded with the key)`);
  }
  // one failing commit refuses the whole range: CI then stops before the deploy job, which depends on this one
  if (errors.length) { console.error(errors.join('\n')); console.error(`FAILED: ${errors.length} problem(s); the whole range is refused`); process.exit(1); }
  console.log(`OK (${checked} commits checked, ${exempt} CI commits exempt)`);
} finally { rmSync(tmp, { recursive: true, force: true }); }
