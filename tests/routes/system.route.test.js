import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/systemService/health.service.js', () => ({
  getHealthStatus: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as healthService from '../../services/systemService/health.service.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /health', () => {
  it('returns 200 with health data when service is up', async () => {
    healthService.getHealthStatus.mockResolvedValueOnce({
      service: 'backend',
      database: 'up',
      timestamp: '2024-06-15T12:00:00.000Z',
      uptime_seconds: 100,
    })

    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.service).toBe('backend')
    expect(res.body.data.database).toBe('up')
  })

  it('returns 503 when health service throws', async () => {
    healthService.getHealthStatus.mockRejectedValueOnce(new Error('DB connection failed'))

    const res = await request(app).get('/health')

    expect(res.status).toBe(503)
    expect(res.body.success).toBe(false)
  })
})
