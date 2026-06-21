import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/workoutService/workoutPrediction.service.js', () => ({
  predictWorkoutPlan: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as workoutService from '../../services/workoutService/workoutPrediction.service.js'

// Each call produces a token with a unique user_id to avoid hitting the
// shared in-memory rate-limit store (5 req/day per user_id).
let uidCounter = 0
const makeToken = () =>
  jwt.sign(
    { user_id: `workout-test-user-${++uidCounter}`, email: 'user@example.com', role_type: 'FREEMIUM' },
    'test-secret',
    { expiresIn: '1h' }
  )

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /workout-prediction/predict', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/workout-prediction/predict').send({ fatigueScore: 5 })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ fatigueScore: 5 })
    expect(res.status).toBe(401)
  })

  it('returns 400 when fatigueScore is missing', async () => {
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns 400 when fatigueScore is above 10', async () => {
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ fatigueScore: 11 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when fatigueScore is below 1', async () => {
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ fatigueScore: 0 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when fatigueScore is not a number', async () => {
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ fatigueScore: 'high' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when user has no metrics', async () => {
    workoutService.predictWorkoutPlan.mockRejectedValueOnce(new Error('NO_METRICS_FOUND'))
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ fatigueScore: 5 })
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('returns 503 when IA service is unavailable', async () => {
    workoutService.predictWorkoutPlan.mockRejectedValueOnce(new Error('IA_API_UNAVAILABLE: ECONNREFUSED'))
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ fatigueScore: 5 })
    expect(res.status).toBe(503)
  })

  it('returns 422 when IA data is insufficient', async () => {
    workoutService.predictWorkoutPlan.mockRejectedValueOnce(new Error('IA_API_VALIDATION: missing field'))
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ fatigueScore: 5 })
    expect(res.status).toBe(422)
  })

  it('returns 500 on unexpected service error', async () => {
    workoutService.predictWorkoutPlan.mockRejectedValueOnce(new Error('Unexpected DB crash'))
    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ fatigueScore: 5 })
    expect(res.status).toBe(500)
  })

  it('returns 200 with the workout plan on success', async () => {
    workoutService.predictWorkoutPlan.mockResolvedValueOnce({
      recommended_program: 'strength',
      recommended_intensity: 'moderate',
      plan: [{ day: 1, exercises: ['squat'] }],
    })

    const res = await request(app)
      .post('/workout-prediction/predict')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ fatigueScore: 7 })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.recommended_program).toBe('strength')
  })
})
