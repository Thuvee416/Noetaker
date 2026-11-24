import { openFromCorner } from './cornerNavigation'
import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('compact meeting labels stop at three first names and the note keeps every full name', async () => {
  const app = await electron.launch({ args: [join(import.meta.dirname, '../out/main/index.js')], env: {
    ...process.env, NOETAKER_FAKE: '1', NOETAKER_USER_DATA: mkdtempSync(join(tmpdir(), 'noetaker-e2e-')),
  } })
  try {
    const page = await app.firstWindow()
    await expect(page.getByTestId('home')).toBeVisible()
    await app.evaluate(() => (globalThis as unknown as { __fake__: { manyMeetings(o: unknown): void } }).__fake__.manyMeetings({ n: 1, clean: true }))
    const names = ['Sam Rivera', 'Ann Lee', 'Bo Park', 'Cy Ho', 'Di Wu', 'Eli Grey', 'Finn Day', 'Gia Ray', 'Hal Kim']
    const ids = await page.evaluate(async (names) => {
      await window.noetaker.settings.setName(names[0])
      const [meeting] = await window.noetaker.meetings.cards({ limit: 1 })
      await window.noetaker.meetings.setAttendees(meeting.id, names.map(name => ({ name, email: null })))
      const folder = await window.noetaker.folders.create('Research')
      if (!folder) throw new Error('Could not create fixture folder')
      await window.noetaker.folders.add(folder.id, meeting.id)
      return { meeting: meeting.id, folder: folder.id }
    }, names)
    await page.reload()
    await expect(page.getByTestId('past-note-attendees')).toHaveText('Ann, Bo, Cy and 5 more')
    await page.getByTestId('sidebar-folder-open').filter({ hasText: 'Research' }).click()
    await expect(page.getByTestId('past-note-attendees')).toHaveText('Ann, Bo, Cy and 5 more')
    await page.getByTestId('past-note').click()
    await expect(page.getByTestId('note-attendees-summary')).toHaveText('Ann, Bo +6')
    await expect(page.getByTestId('note-attendees')).toHaveAccessibleName('Ann, Bo and 6 more')
    await page.getByTestId('note-attendees').click()
    await expect(page.getByTestId('people-row')).toHaveCount(names.length)
    for (const name of names) await expect(page.getByTestId('people-list')).toContainText(name)
    await page.keyboard.press('Escape')
    await page.evaluate(id => window.noetaker.meetings.trash(id), ids.meeting)
    await openFromCorner(page, 'nav-trash')
    await expect(page.getByTestId('past-note-attendees')).toHaveText('Ann, Bo, Cy and 5 more')
  } finally { await app.close() }
})
