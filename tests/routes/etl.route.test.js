import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/etlService/etl.service.js', () => ({
  getEtlExecutions: vi.fn(),
  getEtlById: vi.fn(),
  launchEtlPipeline: vi.fn(),
  pushEtlData: vi.fn(),
  updateEtlStatus: vi.fn(),
  markEtlAsRejected: vi.fn(),
  deleteEtlExecution: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as etlService from '../../services/etlService/etl.service.js'

const adminToken = jwt.sign(
  { user_id: 'admin-1', email: 'admin@example.com', role_type: 'ADMIN' },
  'test-secret',
  { expiresIn: '1h' }
)

const userToken = jwt.sign(
  { user_id: 'user-1', email: 'user@example.com', role_type: 'FREEMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)

beforeEach(() => vi.clearAllMocks())

// ── GET /etl/etlExecutions (public) ──────────────────────────────────────────

describe('GET /etl/etlExecutions', () => {
  it('returns 200 with executions list', async () => {
    etlService.getEtlExecutions.mockResolvedValueOnce([{ id: 'exec-1', status: 'LOADED' }])
    const res = await request(app).get('/etl/etlExecutions')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns 500 when service throws', async () => {
    etlService.getEtlExecutions.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/etl/etlExecutions')
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })
})

// ── GET /etl/:id (admin) ──────────────────────────────────────────────────────

describe('GET /etl/:id', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/etl/exec-1')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    const res = await request(app).get('/etl/exec-1').set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 with execution data for admin', async () => {
    etlService.getEtlById.mockResolvedValueOnce({ id: 'exec-1', status: 'LOADED' })
    const res = await request(app).get('/etl/exec-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('exec-1')
  })

  it('returns 404 when execution is not found', async () => {
    etlService.getEtlById.mockResolvedValueOnce(null)
    const res = await request(app).get('/etl/missing').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    etlService.getEtlById.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/etl/exec-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── POST /etl/:pipeline (admin) ───────────────────────────────────────────────

describe('POST /etl/:pipeline', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/etl/nutrition')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    const res = await request(app).post('/etl/nutrition').set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 and launches the pipeline for admin', async () => {
    etlService.launchEtlPipeline.mockResolvedValueOnce({ execution_id: 'exec-1' })
    const res = await request(app).post('/etl/nutrition').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 when pipeline launch fails', async () => {
    etlService.launchEtlPipeline.mockRejectedValueOnce(new Error('ETL unreachable'))
    const res = await request(app).post('/etl/nutrition').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── POST /etl/validate/:id (admin) ────────────────────────────────────────────

describe('POST /etl/validate/:id', () => {
  it('returns 200 after pushing ETL data and updating status', async () => {
    etlService.pushEtlData.mockResolvedValueOnce({ status: 'LOADED' })
    etlService.updateEtlStatus.mockResolvedValueOnce({ id: 'exec-1', status: 'LOADED' })
    const res = await request(app)
      .post('/etl/validate/exec-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pipeline: 'nutrition' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 200 without updating status when pushEtlData returns no status field', async () => {
    etlService.pushEtlData.mockResolvedValueOnce({ loaded: true })
    const res = await request(app)
      .post('/etl/validate/exec-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pipeline: 'nutrition' })
    expect(res.status).toBe(200)
    expect(etlService.updateEtlStatus).not.toHaveBeenCalled()
  })

  it('returns 500 when pushEtlData fails', async () => {
    etlService.pushEtlData.mockRejectedValueOnce(new Error('ETL error'))
    const res = await request(app)
      .post('/etl/validate/exec-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pipeline: 'nutrition' })
    expect(res.status).toBe(500)
  })
})

// ── POST /etl/reject/:id (admin) ──────────────────────────────────────────────

describe('POST /etl/reject/:id', () => {
  it('returns 200 after marking execution as rejected', async () => {
    etlService.markEtlAsRejected.mockResolvedValueOnce({ id: 'exec-1', status: 'REJECTED' })
    const res = await request(app)
      .post('/etl/reject/exec-1')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 when service throws', async () => {
    etlService.markEtlAsRejected.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .post('/etl/reject/exec-1')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── DELETE /etl/:id (admin) ───────────────────────────────────────────────────

describe('DELETE /etl/:id', () => {
  it('returns 200 after deleting the execution', async () => {
    etlService.deleteEtlExecution.mockResolvedValueOnce({ id: 'exec-1' })
    const res = await request(app)
      .delete('/etl/exec-1')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 when execution is not found', async () => {
    etlService.deleteEtlExecution.mockResolvedValueOnce(null)
    const res = await request(app)
      .delete('/etl/missing')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    etlService.deleteEtlExecution.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .delete('/etl/exec-1')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})
