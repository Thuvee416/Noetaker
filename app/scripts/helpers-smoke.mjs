#!/usr/bin/env node
// Runs the helpers of an installed Windows or Linux Noe Taker from its own folder, the way the app does (no shell):
//   node scripts/helpers-smoke.mjs --resources <install>/resources [--model ggml-tiny.en.bin --wav clip.wav --expect a,b] [--no-whisper]
// The recorder answers each subcommand and records a few seconds (from whatever devices the runner has), the system and
// AI apps helpers start, and with --model whisper-server starts from there and transcribes the clip (scripts/whisper-smoke.mjs).
// --no-whisper: a build without whisper-server (CI's tests, NOETAKER_NO_WHISPER=1).
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values: a } = parseArgs({ options: { resources: { type: 'string' }, 'no-whisper': { type: 'boolean' }, model: { type: 'string' }, wav: { type: 'string' }, expect: { type: 'string' } } })
if (!a.resources) { console.error('--resources is needed'); process.exit(2) }
const win = process.platform === 'win32'
const bin = (name) => join(a.resources, 'bin', win ? `${name}.exe` : name)
let failures = 0
const check = (ok, what, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? `: ${detail}` : ''}`); if (!ok) failures++ }
const json = (s) => { try { return JSON.parse(s) } catch { return undefined } }
const run = (exe, args, env = {}) => spawnSync(exe, args, { encoding: 'utf8', timeout: 60_000, windowsHide: true, env: { ...process.env, ...env } })

for (const name of ['noetaker-audio', 'noetaker-system', 'noetaker-mcp']) check(existsSync(bin(name)), `${name} is installed`, bin(name))
check(existsSync(join(a.resources, 'dict', 'words')), 'the word list is installed')
// Linux: the notes engine's allocator shim (#32)
if (process.platform === 'linux') check(existsSync(bin('libnoetaker-bigalloc.so')), 'the notes engine\'s allocator shim is installed', bin('libnoetaker-bigalloc.so'))
if (!a['no-whisper']) {
  check(existsSync(bin('whisper-server')), 'whisper-server is installed', bin('whisper-server'))
  check(existsSync(join(a.resources, 'vad', 'ggml-silero-v6.2.0.bin')), 'the VAD model is installed')
  const libs = readdirSync(join(a.resources, 'bin')).filter((f) => (win ? /^ggml.*\.dll$/ : /^libggml.*\.so$/).test(f))
  check(libs.some((f) => /cpu/i.test(f)), "whisper-server's CPU backends are installed", libs.join(' '))
}

const audio = bin('noetaker-audio')
const locales = run(audio, ['speech-locales'])
check(locales.status === 0 && json(locales.stdout)?.available === false, 'noetaker-audio speech-locales: no Apple speech here', locales.stdout.trim())
const mics = run(audio, ['mic-devices'])
check(mics.status === 0 && Array.isArray(json(mics.stdout)?.devices), 'noetaker-audio mic-devices', mics.stdout.trim() || mics.stderr.trim())
const usage = run(audio, [])
check(usage.status !== 0 && /usage/i.test(usage.stderr), 'noetaker-audio without a command says how to use it')

// a few seconds of recording, then stop on stdin like the app
const dir = mkdtempSync(join(tmpdir(), 'noetaker-rec-'))
const rec = await new Promise((done) => {
  const child = spawn(audio, ['record', '--dir', dir], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
  let out = ''
  child.stdout.on('data', (d) => { out += d.toString('latin1') })
  child.stderr.on('data', (d) => process.stderr.write(`  noetaker-audio: ${d}`))
  setTimeout(() => child.stdin.write('stop\n'), 3000)
  const kill = setTimeout(() => child.kill(), 20_000)
  child.on('exit', (code) => { clearTimeout(kill); done({ code, levels: (out.match(/"t":"level"/g) ?? []).length, mic: /"t":"mic"/.test(out) }) })
})
check(rec.code === 0, 'noetaker-audio record stops cleanly on "stop"', `exit ${rec.code}`)
check(rec.levels >= 15, 'noetaker-audio record sends sound levels', `${rec.levels} in 3 s`)
check(rec.mic, 'noetaker-audio record says which mic it uses')

const sys = run(bin('noetaker-system'), ['running-apps', win ? 'no-such-app.exe' : 'no-such-app'])
check(sys.status === 0 && Array.isArray(json(sys.stdout)), 'noetaker-system running-apps', sys.stdout.trim() || sys.stderr.trim())
const apps = run(bin('noetaker-system'), ['mic-apps'])
check(Array.isArray(json(apps.stdout)) || apps.status !== 0, 'noetaker-system mic-apps answers', apps.stdout.trim() || `exit ${apps.status}`)
// nothing to talk to: the relay must say so and end, not hang. A copy away from the install folder, so it can't find
// and start the installed Noe Taker (it looks next to itself on Windows)
const relay = join(mkdtempSync(join(tmpdir(), 'noetaker-mcp-')), win ? 'noetaker-mcp.exe' : 'noetaker-mcp')
copyFileSync(bin('noetaker-mcp'), relay)
const mcp = spawnSync(relay, [], { input: '', encoding: 'utf8', timeout: 90_000, windowsHide: true, env: { ...process.env, NOETAKER_USER_DATA: mkdtempSync(join(tmpdir(), 'noetaker-p-')) } })
check(mcp.status === 1 && mcp.stderr.trim().length > 0, 'noetaker-mcp ends with words when Noe Taker is not open', mcp.stderr.trim().split('\n')[0])

if (a.model && a.wav) {
  const here = dirname(fileURLToPath(import.meta.url))
  const w = spawnSync(process.execPath, [join(here, 'whisper-smoke.mjs'), '--bin', bin('whisper-server'), '--model', a.model,
    '--vad', join(a.resources, 'vad', 'ggml-silero-v6.2.0.bin'), '--wav', a.wav, ...(a.expect ? ['--expect', a.expect] : []), '--runs', '1', '--label', 'installed'], { stdio: 'inherit' })
  check(w.status === 0, 'whisper-server from the install folder transcribes the clip')
}

console.log(failures ? `${failures} failed` : 'all passed')
process.exit(failures ? 1 : 0)
