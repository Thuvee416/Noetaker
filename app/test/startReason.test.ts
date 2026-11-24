import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AI_APP_ARG, startArgs, startReason } from '../src/main/startReason'

const env = {}

describe('why Noe Taker started (#147)', () => {
  it('is an AI app when its noetaker-mcp says so', () => {
    expect(startReason({ argv: ['noetaker.exe', '--hidden', AI_APP_ARG], env })).toBe('ai-app')
    expect(startReason({ argv: ['Noe Taker'], env: { NOETAKER_STARTED_BY: 'ai-app' } })).toBe('ai-app')
  })
  it('is an AI app when an older noetaker-mcp started it with only --hidden (Linux can see the parent)', () => {
    expect(startReason({ argv: ['noetaker', '--hidden'], env, parent: 'noetaker-mcp' })).toBe('ai-app')
    expect(startReason({ argv: ['noetaker.exe', '--hidden'], env, parent: 'noetaker-mcp.exe' })).toBe('ai-app')
  })
  it('is login for the login item (--hidden on Windows and Linux, the Mac says so itself)', () => {
    expect(startReason({ argv: ['noetaker.exe', '--hidden'], env })).toBe('login')
    expect(startReason({ argv: ['Noe Taker'], env, openedAtLogin: true })).toBe('login')
    expect(startReason({ argv: ['noetaker', '--hidden'], env, parent: 'systemd' })).toBe('login')
  })
  it('is an update when the installer opens it again', () => {
    expect(startReason({ argv: ['noetaker.exe', '--updated'], env })).toBe('update')
  })
  it('is the person otherwise (a shortcut, the Start menu, a notification clicked after quitting)', () => {
    expect(startReason({ argv: ['noetaker.exe'], env })).toBe('user')
    expect(startReason({ argv: ['noetaker.exe', '--allow-file-access-from-files'], env })).toBe('user')
  })
  it('logs the switches it was given, never a path', () => {
    expect(startArgs(['C:\\Users\\sam\\AppData\\Local\\Programs\\noetaker\\noetaker.exe', '--hidden', AI_APP_ARG, 'C:\\Users\\sam\\file.txt', '--x=/home/sam/a'])).toBe(`--hidden ${AI_APP_ARG} --x`)
    expect(startArgs(['Noe Taker'])).toBe('none')
  })
  it('is what both noetaker-mcp helpers pass when they start Noe Taker', () => {
    for (const f of ['native/noetaker-mcp-relay/src/main.rs', 'native/noetaker-mcp/main.swift']) expect(readFileSync(join(__dirname, '..', f), 'utf8')).toContain(`"${AI_APP_ARG}"`)
  })
})
