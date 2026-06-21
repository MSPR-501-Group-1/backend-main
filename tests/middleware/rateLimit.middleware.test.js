import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { workoutPredictionDailyLimit } from '../../middlewares/rateLimit.middleware.js'

// Build a minimal express app that exposes the rate limiter on a test route.
// Each test should use a unique IP to avoid cross-test state in the shared store.
const makeApp = () => {
  const app = express()
  app.use(express.json())
  app.post('/test', workoutPredictionDailyLimit, (_req, res) => res.json({ ok: true }))
  return app
}

describe('workoutPredictionDailyLimit', () => {
  it('is a middleware function', () => {
    expect(typeof workoutPredictionDailyLimit).toBe('function')
  })

  it('allows requests below the daily limit', async () => {
    const app = makeApp()
    const res = await request(app)
      .post('/test')
      .set('X-Forwarded-For', '10.10.10.1')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 429 with French message once the limit (5) is exceeded', async () => {
    const app = makeApp()
    const ip = '10.10.10.2'

    // Exhaust the 5-request daily limit
    for (let i = 0; i < 5; i++) {
      await request(app).post('/test').set('X-Forwarded-For', ip)
    }

    // Sixth request should be blocked
    const res = await request(app).post('/test').set('X-Forwarded-For', ip)
    expect(res.status).toBe(429)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/Limite quotidienne atteinte/)
  })

  it('uses req.user.user_id as the rate-limit key when present', async () => {
    // Two different users should get independent limits even from the same IP
    const app = express()
    app.use(express.json())
    app.post('/test', (req, _res, next) => {
      req.user = { user_id: req.headers['x-user-id'] }
      next()
    }, workoutPredictionDailyLimit, (_req, res) => res.json({ ok: true }))

    const ip = '10.10.10.3'

    // Exhaust limit for user-A
    for (let i = 0; i < 5; i++) {
      await request(app).post('/test').set('X-Forwarded-For', ip).set('x-user-id', 'user-A')
    }

    // user-A is rate-limited
    const resA = await request(app).post('/test').set('X-Forwarded-For', ip).set('x-user-id', 'user-A')
    expect(resA.status).toBe(429)

    // user-B (same IP) is not rate-limited — proves user_id is the key
    const resB = await request(app).post('/test').set('X-Forwarded-For', ip).set('x-user-id', 'user-B')
    expect(resB.status).toBe(200)
  })
})
