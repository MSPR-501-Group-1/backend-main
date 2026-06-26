import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/nutritionIAService/nutritionIA.service.js', () => ({
  getMealPlan: vi.fn(),
  analyzeMeal: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as nutritionIAService from '../../services/nutritionIAService/nutritionIA.service.js'

const ownerToken = jwt.sign(
  { user_id: 'user-1', email: 'user@example.com', role_type: 'FREEMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)
const adminToken = jwt.sign(
  { user_id: 'admin-1', email: 'admin@example.com', role_type: 'ADMIN' },
  'test-secret',
  { expiresIn: '1h' }
)
const otherToken = jwt.sign(
  { user_id: 'other-user', email: 'other@example.com', role_type: 'FREEMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)

beforeEach(() => vi.clearAllMocks())

// ── POST /nutrition-ia/users/:id/meal-plan ────────────────────────────────────

describe('POST /nutrition-ia/users/:id/meal-plan', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/nutrition-ia/users/user-1/meal-plan')
    expect(res.status).toBe(401)
  })

  it('returns 403 when another non-admin user accesses', async () => {
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/meal-plan')
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 with meal plan for owner', async () => {
    const mealPlan = { days: 7, meals: [] }
    nutritionIAService.getMealPlan.mockResolvedValueOnce(mealPlan)
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/meal-plan')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })

  it('uses the days query parameter', async () => {
    nutritionIAService.getMealPlan.mockResolvedValueOnce({ days: 3, meals: [] })
    await request(app)
      .post('/nutrition-ia/users/user-1/meal-plan?days=3')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(nutritionIAService.getMealPlan).toHaveBeenCalledWith('user-1', 3)
  })

  it('defaults to 7 days when no days param provided', async () => {
    nutritionIAService.getMealPlan.mockResolvedValueOnce({ days: 7, meals: [] })
    await request(app)
      .post('/nutrition-ia/users/user-1/meal-plan')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(nutritionIAService.getMealPlan).toHaveBeenCalledWith('user-1', 7)
  })

  it('returns 200 when admin calls the endpoint', async () => {
    nutritionIAService.getMealPlan.mockResolvedValueOnce({ days: 7, meals: [] })
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/meal-plan')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 500 when service throws', async () => {
    nutritionIAService.getMealPlan.mockRejectedValueOnce(new Error('IA unavailable'))
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/meal-plan')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(500)
  })
})

// ── POST /nutrition-ia/users/:id/analyze-meal ─────────────────────────────────

describe('POST /nutrition-ia/users/:id/analyze-meal', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/nutrition-ia/users/user-1/analyze-meal')
    expect(res.status).toBe(401)
  })

  it('returns 403 when another user accesses', async () => {
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/analyze-meal')
      .set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 when no file is provided', async () => {
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/analyze-meal')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns 200 with analysis when image is uploaded', async () => {
    const analysis = { calories: 500, protein: 30 }
    nutritionIAService.analyzeMeal.mockResolvedValueOnce(analysis)
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/analyze-meal')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('fake image data'), { filename: 'meal.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })

  it('rejects non-image uploads via multer fileFilter', async () => {
    // multer passes non-MulterError to global error handler → 500
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/analyze-meal')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('fake pdf'), { filename: 'doc.pdf', contentType: 'application/pdf' })
    expect([400, 500]).toContain(res.status)
  })

  it('returns 500 when service throws', async () => {
    nutritionIAService.analyzeMeal.mockRejectedValueOnce(new Error('IA error'))
    const res = await request(app)
      .post('/nutrition-ia/users/user-1/analyze-meal')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('fake image'), { filename: 'meal.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(500)
  })
})
