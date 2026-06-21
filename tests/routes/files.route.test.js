import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'node:path'

vi.mock('../../services/filesService/files.service.js', () => ({
  getFilePath: vi.fn(),
  fileExists: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as filesService from '../../services/filesService/files.service.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /files/:type/:filename', () => {
  it('returns 404 when file does not exist', async () => {
    filesService.getFilePath.mockReturnValueOnce('/data/processed/nutrition/ingredient_batch1.csv')
    filesService.fileExists.mockReturnValueOnce(false)

    const res = await request(app).get('/files/nutrition/batch1')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('File not found')
  })

  it('returns 200 and streams the file when it exists', async () => {
    const realFilePath = path.join(process.cwd(), 'package.json')
    filesService.getFilePath.mockReturnValueOnce(realFilePath)
    filesService.fileExists.mockReturnValueOnce(true)

    const res = await request(app).get('/files/nutrition/batch1')
    expect(res.status).toBe(200)
  })

  it('returns 500 when getFilePath throws', async () => {
    filesService.getFilePath.mockImplementationOnce(() => {
      throw new Error('Unexpected error')
    })

    const res = await request(app).get('/files/nutrition/batch1')
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Internal server error')
  })
})
