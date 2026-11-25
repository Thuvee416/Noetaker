import { expect, it } from 'vitest'
import { titleBarOverlay, windowChrome } from '../src/main/windowChrome'

it('a Mac keeps its inset traffic lights and native glass, exactly as before', () => {
  expect(windowChrome('darwin', false)).toEqual({ titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 20 }, backgroundColor: '#000000', vibrancy: 'under-window', visualEffectState: 'active' })
  expect(windowChrome('darwin', true)).toMatchObject({ backgroundColor: '#000000' })
})

it('Windows and Linux: no title or menu bar; the system draws its window buttons over the top right, in the sidebar colours', () => {
  for (const os of ['win32', 'linux']) {
    expect(windowChrome(os, false)).toEqual({ titleBarStyle: 'hidden', titleBarOverlay: { color: '#0A0A0A', symbolColor: '#F4F4F5', height: 52 }, autoHideMenuBar: true, backgroundColor: '#0A0A0A' })
    expect(windowChrome(os, true)).toEqual({ titleBarStyle: 'hidden', titleBarOverlay: { color: '#0A0A0A', symbolColor: '#F4F4F5', height: 52 }, autoHideMenuBar: true, backgroundColor: '#0A0A0A' })
  }
  expect(titleBarOverlay(true)).toEqual({ color: '#0A0A0A', symbolColor: '#F4F4F5', height: 52 })
})
