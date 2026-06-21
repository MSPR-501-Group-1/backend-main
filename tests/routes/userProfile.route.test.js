import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/userService/userProfile.service.js', () => ({
  getUserProfileById: vi.fn(),
  createUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  deleteUserProfile: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as userProfileService from '../../services/userService/userProfile.service.js'

const adminToken = jwt.sign(
  { user_id: 'admin-1', email: 'admin@example.com', role_type: 'ADMIN' },
  'test-secret',
  { expiresIn: '1h' }
)
const ownerToken = jwt.sign(
  { user_id: 'user-1', email: 'user@example.com', role_type: 'FREEMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)

const sampleProfile = {
  metric_id: 'm-1',
  user_id: 'user-1',
  height_cm: 175,
  weight_kg: 70,
  fitness_level: 'intermediate',
}

beforeEach(() => vi.clearAllMocks())

// ── GET /user-profiles/:id ────────────────────────────────────────────────────

describe('GET /user-profiles/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/user-profiles/user-1')
    expect(res.status).toBe(401)
  })

  it('returns 403 when user tries to access another user profile', async () => {
    const res = await request(app).get('/user-profiles/other-user').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 with profile for owner', async () => {
    userProfileService.getUserProfileById.mockResolvedValueOnce(sampleProfile)
    const res = await request(app).get('/user-profiles/user-1').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.metric_id).toBe('m-1')
  })

  it('returns 200 with profile for admin', async () => {
    userProfileService.getUserProfileById.mockResolvedValueOnce(sampleProfile)
    const res = await request(app).get('/user-profiles/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 404 when profile does not exist', async () => {
    userProfileService.getUserProfileById.mockResolvedValueOnce(null)
    const res = await request(app).get('/user-profiles/user-1').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    userProfileService.getUserProfileById.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/user-profiles/user-1').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(500)
  })
})

// ── POST /user-profiles/:id ───────────────────────────────────────────────────

describe('POST /user-profiles/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/user-profiles/user-1').send({})
    expect(res.status).toBe(401)
  })

  it('returns 201 when profile is created', async () => {
    userProfileService.createUserProfile.mockResolvedValueOnce(sampleProfile)
    const res = await request(app)
      .post('/user-profiles/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ height_cm: 175, weight_kg: 70 })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })

  it('returns 400 when body contains invalid enum', async () => {
    const res = await request(app)
      .post('/user-profiles/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ gender: 'Unknown' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when user does not exist', async () => {
    userProfileService.createUserProfile.mockRejectedValueOnce(new Error('USER_NOT_FOUND'))
    const res = await request(app)
      .post('/user-profiles/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
    expect(res.status).toBe(404)
  })

  it('returns 500 on unexpected error', async () => {
    userProfileService.createUserProfile.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .post('/user-profiles/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
    expect(res.status).toBe(500)
  })
})

// ── PUT /user-profiles/:id ────────────────────────────────────────────────────

describe('PUT /user-profiles/:id', () => {
  it('returns 200 when profile is updated', async () => {
    userProfileService.updateUserProfile.mockResolvedValueOnce({ ...sampleProfile, weight_kg: 75 })
    const res = await request(app)
      .put('/user-profiles/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ weight_kg: 75 })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 when profile does not exist', async () => {
    userProfileService.updateUserProfile.mockResolvedValueOnce(null)
    const res = await request(app)
      .put('/user-profiles/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ weight_kg: 75 })
    expect(res.status).toBe(404)
  })

  it('returns 400 when no fields to update', async () => {
    userProfileService.updateUserProfile.mockRejectedValueOnce(new Error('NO_FIELDS_TO_UPDATE'))
    const res = await request(app)
      .put('/user-profiles/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('returns 500 on unexpected error', async () => {
    userProfileService.updateUserProfile.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .put('/user-profiles/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ weight_kg: 75 })
    expect(res.status).toBe(500)
  })
})

// ── DELETE /user-profiles/:id (admin only) ────────────────────────────────────

describe('DELETE /user-profiles/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).delete('/user-profiles/user-1')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    const res = await request(app).delete('/user-profiles/user-1').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 when admin deletes a profile', async () => {
    userProfileService.deleteUserProfile.mockResolvedValueOnce({ metric_id: 'm-1' })
    const res = await request(app).delete('/user-profiles/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 when profile does not exist', async () => {
    userProfileService.deleteUserProfile.mockResolvedValueOnce(null)
    const res = await request(app).delete('/user-profiles/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    userProfileService.deleteUserProfile.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).delete('/user-profiles/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})
