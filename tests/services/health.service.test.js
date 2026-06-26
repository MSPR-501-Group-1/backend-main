import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../../db.js'

const mockQuery = vi.mocked(db.query)

import { getHealthStatus } from '../../services/systemService/health.service.js'

beforeEach(() => vi.clearAllMocks())

describe('health.service - getHealthStatus', () => {
  it('returns health status when database is reachable', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })

    const result = await getHealthStatus()

    expect(mockQuery).toHaveBeenCalledWith('SELECT 1')
    expect(result).toMatchObject({
      service: 'backend',
      database: 'up',
    })
    expect(typeof result.timestamp).toBe('string')
    expect(typeof result.uptime_seconds).toBe('number')
  })

  it('propagates DB errors so the controller can return 503', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'))
    await expect(getHealthStatus()).rejects.toThrow('Connection refused')
  })
})
