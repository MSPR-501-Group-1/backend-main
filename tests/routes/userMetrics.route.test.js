import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/userService/userMetrics.service.js', () => ({
  getFitnessMetrics: vi.fn(),
  getAllUsersMetrics: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as userMetricsService from '../../services/userService/userMetrics.service.js'

const adminToken = jwt.sign(
  { user_id: 'admin-1', email: 'admin@example.com', role_type: 'ADMIN' },
  'test-secret',
  { expiresIn: '1h' }
)
const premiumToken = jwt.sign(
  { user_id: 'user-1', email: 'user@example.com', role_type: 'PREMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)
const freemiumToken = jwt.sign(
  { user_id: 'user-2', email: 'free@example.com', role_type: 'FREEMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)

const fitnessData = {
  dailyMetrics: [],
  averageSessionsPerWeek: 3.5,
  averageDuration: 45,
  totalMinutes: 630,
  distribution: [],
}

beforeEach(() => vi.clearAllMocks())

// ── GET /metrics/fitness ──────────────────────────────────────────────────────

describe('GET /metrics/fitness', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/metrics/fitness')
    expect(res.status).toBe(401)
  })

  it('returns 403 for FREEMIUM users', async () => {
    const res = await request(app)
      .get('/metrics/fitness')
      .set('Authorization', `Bearer ${freemiumToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 with fitness data for PREMIUM users', async () => {
    userMetricsService.getFitnessMetrics.mockResolvedValueOnce(fitnessData)
    const res = await request(app)
      .get('/metrics/fitness')
      .set('Authorization', `Bearer ${premiumToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })

  it('returns 200 with fitness data for ADMIN users', async () => {
    userMetricsService.getFitnessMetrics.mockResolvedValueOnce(fitnessData)
    const res = await request(app)
      .get('/metrics/fitness')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('forwards the range query parameter to the service', async () => {
    userMetricsService.getFitnessMetrics.mockResolvedValueOnce(fitnessData)
    await request(app)
      .get('/metrics/fitness?range=7d')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(userMetricsService.getFitnessMetrics).toHaveBeenCalledWith('7d')
  })

  it('returns 500 when service throws', async () => {
    userMetricsService.getFitnessMetrics.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .get('/metrics/fitness')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── GET /metrics/usersMetrics (admin only) ────────────────────────────────────

describe('GET /metrics/usersMetrics', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/metrics/usersMetrics')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    const res = await request(app)
      .get('/metrics/usersMetrics')
      .set('Authorization', `Bearer ${premiumToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 with metrics for admin', async () => {
    userMetricsService.getAllUsersMetrics.mockResolvedValueOnce(fitnessData)
    const res = await request(app)
      .get('/metrics/usersMetrics')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 when service throws', async () => {
    userMetricsService.getAllUsersMetrics.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .get('/metrics/usersMetrics')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})
