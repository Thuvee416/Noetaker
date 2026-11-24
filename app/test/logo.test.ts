import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MARK } from '../src/shared/logo'

const svg = (name: string) => readFileSync(join(import.meta.dirname, '../build', name), 'utf8')
const paths = (text: string) => [...text.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])

// The interface draws the silhouette from shared/logo.ts. The dock icon shades the same ribbon.
describe('logo', () => {
  it('keeps the isometric ribbon silhouette', () => {
    expect(createHash('sha256').update(MARK).digest('hex')).toBe('c7a9a7faab5d15ae25fb2dfdc5e61bc4b9c6315d9943dd24d96cfee1a6ce1c62')
  })
  it('matches build/logo.svg', () => {
    expect(paths(svg('logo.svg'))).toEqual([MARK])
  })
  it('matches build/wordmark.svg', () => {
    const wordmark = svg('wordmark.svg')
    expect(paths(wordmark)).toEqual([MARK])
    expect(wordmark).toContain('>NOE TAKER<')
  })
  it('paints the ribbon on a black icon tile', () => {
    const icon = svg('icon.svg')
    expect(icon).toContain('fill="#000000"')
    expect(icon).toContain('fill="#F6F3EC"')
  })
})
