import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { helperCopyPath, installHelper, launchCommand, mcpAddress, PIPE_FILE, publishPipe, startedHidden } from '../src/main/mcp/paths'

const dirs: string[] = []
afterEach(() => { dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })) })
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'noetaker-mcp-paths-')); dirs.push(d); return d }

describe('where AI apps reach Noe Taker', () => {
  it('is the socket in the profile folder on a Mac, as it always was', () => {
    expect(mcpAddress('darwin', '/Users/sam/Library/Application Support/Noe Taker', 'ab12')).toBe('/Users/sam/Library/Application Support/Noe Taker/mcp.sock')
  })
  it('is the socket in the profile folder on Linux', () => {
    expect(mcpAddress('linux', '/home/sam/.config/Noe Taker', 'ab12')).toBe('/home/sam/.config/Noe Taker/mcp.sock')
  })
  it('is a named pipe on Windows, named afresh each launch so no one else can take the name first', () => {
    expect(mcpAddress('win32', 'C:\\Users\\sam\\AppData\\Roaming\\Noe Taker', 'ab12')).toBe('\\\\.\\pipe\\noetaker-mcp-ab12')
  })
})

// #156: each AI-app start of a second Noe Taker wrote its own pipe's name, then quit, leaving the helper a pipe that was gone
describe('the pipe name file (Windows)', () => {
  it('is written by the Noe Taker that holds the single-instance lock', () => {
    const d = tmp()
    expect(publishPipe('win32', d, '\\\\.\\pipe\\noetaker-mcp-first', true)).toBe(true)
    expect(readFileSync(join(d, PIPE_FILE), 'utf8')).toBe('\\\\.\\pipe\\noetaker-mcp-first')
  })
  it('is never overwritten by a second Noe Taker that is handing off to the running one', () => {
    const d = tmp()
    publishPipe('win32', d, '\\\\.\\pipe\\noetaker-mcp-first', true)
    expect(publishPipe('win32', d, '\\\\.\\pipe\\noetaker-mcp-second', false)).toBe(false)
    expect(readFileSync(join(d, PIPE_FILE), 'utf8')).toBe('\\\\.\\pipe\\noetaker-mcp-first')
  })
  it('is not written on a Mac or Linux (they use the socket)', () => {
    const d = tmp()
    expect(publishPipe('darwin', d, '/x/mcp.sock', true)).toBe(false)
    expect(publishPipe('linux', d, '/x/mcp.sock', true)).toBe(false)
    expect(existsSync(join(d, PIPE_FILE))).toBe(false)
  })
})

describe('what the helper opens when Noe Taker is closed', () => {
  it('is nothing to record on a Mac (it opens Noe Taker by its bundle id)', () => {
    expect(launchCommand('darwin', true, '/Applications/Noe Taker.app/Contents/MacOS/noetaker', {})).toBeUndefined()
  })
  it('is the installed noetaker.exe on Windows', () => {
    const exe = 'C:\\Users\\sam\\AppData\\Local\\Programs\\Noe Taker\\noetaker.exe'
    expect(launchCommand('win32', true, exe, {})).toBe(exe)
  })
  it('is the AppImage on Linux, wherever it was started from this time', () => {
    expect(launchCommand('linux', true, '/tmp/.mount_Noe Taker1/noetaker', { APPIMAGE: '/home/sam/Apps/noetaker.AppImage' })).toBe('/home/sam/Apps/noetaker.AppImage')
    // not from an AppImage: the mount path would be gone next time
    expect(launchCommand('linux', true, '/opt/Noe Taker/noetaker', {})).toBeUndefined()
  })
  it('is nothing for a dev or test run (that would start a bare Electron)', () => {
    expect(launchCommand('win32', false, 'C:\\dev\\electron.exe', {})).toBeUndefined()
    expect(launchCommand('linux', false, '/dev/electron', { APPIMAGE: '/x.AppImage' })).toBeUndefined()
  })
  it('starts without a window when the helper asks, a Mac too (an AI app session no longer pops Noe Taker up, #54)', () => {
    expect(startedHidden('win32', ['noetaker.exe', '--hidden'])).toBe(true)
    expect(startedHidden('linux', ['noetaker', '--hidden'])).toBe(true)
    expect(startedHidden('linux', ['noetaker'])).toBe(false)
    expect(startedHidden('darwin', ['Noe Taker', '--hidden'])).toBe(true)
    expect(startedHidden('darwin', ['Noe Taker'])).toBe(false)
  })
})

describe('the helper AI apps are told to start', () => {
  it('is copied into the profile folder on Linux only (the AppImage moves each launch)', () => {
    expect(helperCopyPath('linux', '/home/sam/.config/Noe Taker')).toBe('/home/sam/.config/Noe Taker/bin/noetaker-mcp')
    expect(helperCopyPath('darwin', '/x')).toBeUndefined()
    expect(helperCopyPath('win32', 'C:\\x')).toBeUndefined()
  })
  it('copies a new helper over the old one, runnable, and leaves an up to date one alone', () => {
    const dir = tmp()
    const src = join(dir, 'noetaker-mcp'), dest = join(dir, 'profile', 'bin', 'noetaker-mcp')
    writeFileSync(src, 'v1')
    expect(installHelper(src, dest)).toBe(true)
    expect(readFileSync(dest, 'utf8')).toBe('v1')
    if (process.platform !== 'win32') expect(statSync(dest).mode & 0o777).toBe(0o755)
    expect(installHelper(src, dest)).toBe(false)
    writeFileSync(src, 'v2')
    expect(installHelper(src, dest)).toBe(true)
    expect(readFileSync(dest, 'utf8')).toBe('v2')
  })
  it('gives up quietly when there is no helper to copy', () => {
    const dir = tmp()
    expect(installHelper(join(dir, 'missing'), join(dir, 'bin', 'noetaker-mcp'))).toBe(false)
  })
})
