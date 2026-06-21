import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/analyticsService/businessKpi.service.js', () => ({
  getDashboardData: vi.fn(),
  getBusinessKpis: vi.fn(),
  getNutritionAnalytics: vi.fn(),
  getBiometricAnalytics: vi.fn(),
  getDataQualityScore: vi.fn(),
  getPartners: vi.fn(),
  getPartnersDashboard: vi.fn(),
}))
vi.mock('../../services/analyticsService/dataAnomaly.service.js', () => ({
  getAnomalies: vi.fn(),
  correctAnomaly: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as businessKpiService from '../../services/analyticsService/businessKpi.service.js'
import * as dataAnomalyService from '../../services/analyticsService/dataAnomaly.service.js'

const adminToken = jwt.sign(
  { user_id: 'admin-1', email: 'admin@example.com', role_type: 'ADMIN' },
  'test-secret',
  { expiresIn: '1h' }
)
const premiumPlusToken = jwt.sign(
  { user_id: 'pp-1', email: 'pp@example.com', role_type: 'PREMIUM_PLUS' },
  'test-secret',
  { expiresIn: '1h' }
)
const b2bToken = jwt.sign(
  { user_id: 'b2b-1', email: 'b2b@example.com', role_type: 'B2B' },
  'test-secret',
  { expiresIn: '1h' }
)
const premiumToken = jwt.sign(
  { user_id: 'p-1', email: 'p@example.com', role_type: 'PREMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)
const freemiumToken = jwt.sign(
  { user_id: 'f-1', email: 'f@example.com', role_type: 'FREEMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)

const mockData = { result: 'ok' }

beforeEach(() => vi.clearAllMocks())

// ── GET /analytics/business ───────────────────────────────────────────────────

describe('GET /analytics/business', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/analytics/business')
    expect(res.status).toBe(401)
  })

  it('returns 403 for PREMIUM (not in BUSINESS_ANALYTICS group)', async () => {
    const res = await request(app).get('/analytics/business').set('Authorization', `Bearer ${premiumToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 for ADMIN', async () => {
    businessKpiService.getBusinessKpis.mockResolvedValueOnce(mockData)
    const res = await request(app).get('/analytics/business').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 200 for B2B', async () => {
    businessKpiService.getBusinessKpis.mockResolvedValueOnce(mockData)
    const res = await request(app).get('/analytics/business').set('Authorization', `Bearer ${b2bToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    businessKpiService.getBusinessKpis.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/analytics/business').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── GET /analytics/nutrition ──────────────────────────────────────────────────

describe('GET /analytics/nutrition', () => {
  it('returns 403 for FREEMIUM', async () => {
    const res = await request(app).get('/analytics/nutrition').set('Authorization', `Bearer ${freemiumToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 for PREMIUM', async () => {
    businessKpiService.getNutritionAnalytics.mockResolvedValueOnce(mockData)
    const res = await request(app).get('/analytics/nutrition').set('Authorization', `Bearer ${premiumToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    businessKpiService.getNutritionAnalytics.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/analytics/nutrition').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── GET /analytics/biometric ──────────────────────────────────────────────────

describe('GET /analytics/biometric', () => {
  it('returns 200 for PREMIUM_PLUS', async () => {
    businessKpiService.getBiometricAnalytics.mockResolvedValueOnce(mockData)
    const res = await request(app).get('/analytics/biometric').set('Authorization', `Bearer ${premiumPlusToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    businessKpiService.getBiometricAnalytics.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/analytics/biometric').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── GET /partners ─────────────────────────────────────────────────────────────

describe('GET /partners', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/partners')
    expect(res.status).toBe(401)
  })

  it('returns 403 for PREMIUM (not in PARTNERS group)', async () => {
    const res = await request(app).get('/partners').set('Authorization', `Bearer ${premiumToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 for ADMIN', async () => {
    businessKpiService.getPartners.mockResolvedValueOnce([mockData])
    const res = await request(app).get('/partners').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 200 for B2B', async () => {
    businessKpiService.getPartners.mockResolvedValueOnce([mockData])
    const res = await request(app).get('/partners').set('Authorization', `Bearer ${b2bToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    businessKpiService.getPartners.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/partners').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── GET /partners/dashboard ───────────────────────────────────────────────────

describe('GET /partners/dashboard', () => {
  it('returns 200 for ADMIN', async () => {
    businessKpiService.getPartnersDashboard.mockResolvedValueOnce(mockData)
    const res = await request(app).get('/partners/dashboard').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    businessKpiService.getPartnersDashboard.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/partners/dashboard').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── GET /data-quality/score ───────────────────────────────────────────────────

describe('GET /data-quality/score', () => {
  it('returns 403 for PREMIUM', async () => {
    const res = await request(app).get('/data-quality/score').set('Authorization', `Bearer ${premiumToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 for ADMIN', async () => {
    businessKpiService.getDataQualityScore.mockResolvedValueOnce(mockData)
    const res = await request(app).get('/data-quality/score').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    businessKpiService.getDataQualityScore.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/data-quality/score').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── GET /dashboard ────────────────────────────────────────────────────────────

describe('GET /dashboard', () => {
  it('returns 200 for ADMIN', async () => {
    businessKpiService.getDashboardData.mockResolvedValueOnce(mockData)
    const res = await request(app).get('/dashboard').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    businessKpiService.getDashboardData.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/dashboard').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── GET /anomalies ────────────────────────────────────────────────────────────

describe('GET /anomalies', () => {
  it('returns 403 for PREMIUM', async () => {
    const res = await request(app).get('/anomalies').set('Authorization', `Bearer ${premiumToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 for ADMIN', async () => {
    dataAnomalyService.getAnomalies.mockResolvedValueOnce([mockData])
    const res = await request(app).get('/anomalies').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 when service throws', async () => {
    dataAnomalyService.getAnomalies.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/anomalies').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })

  it('returns the status code from error.status when present', async () => {
    const err = Object.assign(new Error('Not Found'), { status: 404 })
    dataAnomalyService.getAnomalies.mockRejectedValueOnce(err)
    const res = await request(app).get('/anomalies').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it('includes details in the response when the error carries a details field', async () => {
    const err = Object.assign(new Error('Validation failed'), { status: 422, details: ['field is required'] })
    dataAnomalyService.getAnomalies.mockRejectedValueOnce(err)
    const res = await request(app).get('/anomalies').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(422)
    expect(res.body.details).toBeDefined()
  })

  it('falls back to the hardcoded message when the error has no message', async () => {
    const err = Object.assign(new Error(''), { status: 422 })
    dataAnomalyService.getAnomalies.mockRejectedValueOnce(err)
    const res = await request(app).get('/anomalies').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(422)
    expect(res.body.message).toBeTruthy()
  })
})

// ── PATCH /anomalies/:id/correct ──────────────────────────────────────────────

describe('PATCH /anomalies/:id/correct', () => {
  it('returns 403 for PREMIUM', async () => {
    const res = await request(app).patch('/anomalies/a-1/correct').set('Authorization', `Bearer ${premiumToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 when anomaly is corrected', async () => {
    dataAnomalyService.correctAnomaly.mockResolvedValueOnce({ anomaly_id: 'a-1', resolved: true })
    const res = await request(app)
      .patch('/anomalies/a-1/correct')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution_action: 'CORRECT', resolved_by: 'admin-1', corrected_value: 42 })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 when service throws', async () => {
    dataAnomalyService.correctAnomaly.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .patch('/anomalies/a-1/correct')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})
