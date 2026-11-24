import { app } from 'electron'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { StartReason } from './startReason'

/**
 * #147: the person quitting Noe Taker (the menu bar's Quit, the app menu, Cmd+Q, Ctrl+Q) leaves this file in the profile,
 * and noetaker-mcp doesn't start Noe Taker for an AI app while it's there. Any other quit (an update, logout, a crash, a
 * quiet Noe Taker quitting by itself) leaves none, so an AI app can still start it then. The person opening Noe Taker again
 * (or a login or update start) removes it.
 */
export const QUIT_MARKER = 'quit-by-user'
/** what noetaker-mcp tells the AI app instead (both helpers have the same words) */
export const CLOSED = 'Noe Taker is closed. Open Noe Taker to use your meetings.'

let asked = false

/** the person chose Quit */
export function quitByUser() { asked = true; app.quit() }
/** the quit was called off (unsaved notes: Return to notes), so a later quit is not the person's unless they ask again */
export function quitCalledOff() { asked = false }
/** tests */
export function resetQuitByUser() { asked = false }

/** Noe Taker is quitting now: marked only when the person asked */
export function quitting(dir: string) {
  if (!asked) return
  try { writeFileSync(join(dir, QUIT_MARKER), '') } catch (e) { console.error('APP could not note the quit', e) }
}

/**
 * At start: any start but an AI app's clears the mark. True: an AI app started Noe Taker after the person quit it
 * (a noetaker-mcp from before the mark), so this Noe Taker stops at once.
 */
export function started(dir: string, reason: StartReason): boolean {
  const file = join(dir, QUIT_MARKER)
  if (reason === 'ai-app') return existsSync(file)
  try { rmSync(file, { force: true }) } catch (e) { console.error('APP could not clear the quit', e) }
  return false
}
