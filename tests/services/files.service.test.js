import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getFilePath, fileExists } from '../../services/filesService/files.service.js'

const __filename = fileURLToPath(import.meta.url)

describe('files.service - getFilePath', () => {
  it('maps "nutrition" type to "ingredient" entity', () => {
    const result = getFilePath('nutrition', 'batch1')
    expect(result).toContain(path.join('nutrition', 'ingredient_batch1.csv'))
  })

  it('maps "exercises" type to "exercise" entity', () => {
    const result = getFilePath('exercises', 'batch1')
    expect(result).toContain(path.join('exercises', 'exercise_batch1.csv'))
  })

  it('falls back to the type name for unknown types', () => {
    const result = getFilePath('custom', 'batch1')
    expect(result).toContain(path.join('custom', 'custom_batch1.csv'))
  })

  it('includes the base directory in the path', () => {
    const result = getFilePath('nutrition', 'batch1')
    expect(result).toContain(path.normalize('data/processed'))
  })
})

describe('files.service - fileExists', () => {
  it('returns true for a path that exists (this test file)', () => {
    expect(fileExists(__filename)).toBe(true)
  })

  it('returns false for a path that does not exist', () => {
    expect(fileExists('/non/existent/path/abc_xyz.csv')).toBe(false)
  })
})
