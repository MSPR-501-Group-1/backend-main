import { describe, it, expect, vi } from 'vitest'

// Mock service layers so no real DB calls happen
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
import * as authService from '../../services/authService/auth.service.js'
import * as userService from '../../services/userService/user.service.js'

// ── POST /auth/login ──────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/auth/login').send({})
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.errors).toBeInstanceOf(Array)
  })

  it('returns 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'Password1' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com' })
    expect(res.status).toBe(400)
  })

  it('returns 401 on invalid credentials', async () => {
    authService.login.mockRejectedValueOnce(new Error('INVALID_CREDENTIALS'))

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPass1' })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns 200 with token on valid credentials', async () => {
    authService.login.mockResolvedValueOnce({
      user_id: 1,
      email: 'user@example.com',
      first_name: 'John',
      last_name: 'Doe',
      display_name: 'Johnny',
      avatar_url: null,
      role_type: 'FREEMIUM',
    })

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'Password1' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBeDefined()
  })
})

// ── POST /auth/register ───────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/auth/register').send({
      password: 'Password1',
      first_name: 'John',
      last_name: 'Doe',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is too weak', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'user@example.com',
      password: 'weak',
      first_name: 'John',
      last_name: 'Doe',
    })
    expect(res.status).toBe(400)
  })

  it('returns 409 when email is already taken', async () => {
    userService.createUser.mockRejectedValueOnce(new Error('EMAIL_EXISTS'))

    const res = await request(app).post('/auth/register').send({
      email: 'taken@example.com',
      password: 'Password1',
      first_name: 'John',
      last_name: 'Doe',
    })
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  it('returns 201 on successful registration', async () => {
    userService.createUser.mockResolvedValueOnce({
      user_id: 99,
      email: 'new@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role_type: 'FREEMIUM',
      history_id: 'abc-123',
    })

    const res = await request(app).post('/auth/register').send({
      email: 'new@example.com',
      password: 'Password1',
      first_name: 'John',
      last_name: 'Doe',
    })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })
})

// ── GET /auth/me ──────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer not.a.real.token')
    expect(res.status).toBe(401)
  })
})
