import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/authService/auth.service.js', () => ({
  login: vi.fn(),
}))
vi.mock('../../services/userService/user.service.js', () => ({
  createUser: vi.fn(),
  getUserById: vi.fn(),
  changePassword: vi.fn(),
}))

import request from 'supertest'
import app from '../../app.js'
import * as userService from '../../services/userService/user.service.js'
import * as authService from '../../services/authService/auth.service.js'

const makeToken = (payload = {}) =>
  jwt.sign(
    { user_id: 'u-1', email: 'user@example.com', role_type: 'FREEMIUM', ...payload },
    'test-secret',
    { expiresIn: '1h' }
  )

beforeEach(() => {
  vi.clearAllMocks()
})

// ── GET /auth/me (authenticated success cases) ────────────────────────────────

describe('GET /auth/me (authenticated)', () => {
  it('returns 200 with user data when token is valid and user exists', async () => {
    userService.getUserById.mockResolvedValueOnce({
      user_id: 'u-1',
      email: 'user@example.com',
      first_name: 'John',
      last_name: 'Doe',
      display_name: 'JD',
      avatar_url: null,
      birth_date: null,
      gender_code: null,
      role_type: 'FREEMIUM',
      created_at: new Date().toISOString(),
      is_active: true,
    })

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.email).toBe('user@example.com')
  })

  it('returns 404 when user exists in token but not in DB', async () => {
    userService.getUserById.mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('returns 500 when getUserById throws unexpectedly', async () => {
    userService.getUserById.mockRejectedValueOnce(new Error('DB connection lost'))

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(500)
  })
})

// ── POST /auth/refresh ────────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/auth/refresh')
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .set('Authorization', 'Bearer not.a.real.token')
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not found in DB', async () => {
    userService.getUserById.mockResolvedValueOnce(null)

    const res = await request(app)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 when user account is inactive', async () => {
    userService.getUserById.mockResolvedValueOnce({ user_id: 'u-1', is_active: false, role_type: 'FREEMIUM', email: 'u@e.com' })

    const res = await request(app)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(401)
  })

  it('returns 200 with a new token for a valid active user', async () => {
    userService.getUserById.mockResolvedValueOnce({ user_id: 'u-1', is_active: true, role_type: 'FREEMIUM', email: 'u@e.com' })

    const res = await request(app)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBeDefined()
  })
})

// ── POST /auth/logout ─────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/auth/logout')
    expect(res.status).toBe(401)
  })

  it('returns 200 with a success message when authenticated', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

// ── POST /auth/register (additional error cases) ─────────────────────────────

describe('POST /auth/register (additional)', () => {
  it('returns 500 on unexpected register error', async () => {
    userService.createUser.mockRejectedValueOnce(new Error('DB_CRASH'))
    const res = await request(app).post('/auth/register').send({
      email: 'new@example.com',
      password: 'Password1',
      first_name: 'John',
      last_name: 'Doe',
    })
    expect(res.status).toBe(500)
  })
})

// ── POST /auth/refresh (additional error cases) ───────────────────────────────

describe('POST /auth/refresh (additional)', () => {
  it('returns 500 on unexpected refresh error', async () => {
    userService.getUserById.mockRejectedValueOnce(new Error('DB_CRASH'))
    const res = await request(app)
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${makeToken()}`)
    expect(res.status).toBe(500)
  })
})

// ── POST /auth/login (ACCOUNT_DISABLED case) ──────────────────────────────────

describe('POST /auth/login (additional cases)', () => {
  it('returns 403 when account is disabled', async () => {
    authService.login.mockRejectedValueOnce(new Error('ACCOUNT_DISABLED'))

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'disabled@example.com', password: 'Password1' })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('returns 500 on unexpected login error', async () => {
    authService.login.mockRejectedValueOnce(new Error('DB_ERROR'))

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'Password1' })

    expect(res.status).toBe(500)
  })
})
