import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/userService/user.service.js', () => ({
  getUsers: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  updateSocialProfile: vi.fn(),
  softDeleteUser: vi.fn(),
  hardDeleteUser: vi.fn(),
  updateAvatarUrl: vi.fn(),
}))
vi.mock('../../services/authService/auth.service.js', () => ({
  login: vi.fn(),
  changePassword: vi.fn(),
}))
vi.mock('../../services/storageService/storage.service.js', () => ({
  uploadFile: vi.fn(),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_MEDIA_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'],
}))

import request from 'supertest'
import app from '../../app.js'
import * as userService from '../../services/userService/user.service.js'
import * as authService from '../../services/authService/auth.service.js'
import * as storageService from '../../services/storageService/storage.service.js'

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

const sampleUser = {
  user_id: 'user-1',
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role_type: 'FREEMIUM',
  is_active: true,
}

beforeEach(() => vi.clearAllMocks())

// ── GET /users (admin only) ───────────────────────────────────────────────────

describe('GET /users', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/users')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const res = await request(app).get('/users').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 with user list for admin', async () => {
    userService.getUsers.mockResolvedValueOnce([sampleUser])
    const res = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns 500 when service throws', async () => {
    userService.getUsers.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── POST /users (admin only) ──────────────────────────────────────────────────

describe('POST /users', () => {
  const validBody = {
    email: 'new@example.com',
    password: 'Password1',
    first_name: 'New',
    last_name: 'User',
  }

  it('returns 401 without token', async () => {
    const res = await request(app).post('/users').send(validBody)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    const res = await request(app).post('/users').set('Authorization', `Bearer ${ownerToken}`).send(validBody)
    expect(res.status).toBe(403)
  })

  it('returns 201 when user is created', async () => {
    userService.createUser.mockResolvedValueOnce({ ...sampleUser, user_id: 'new-1' })
    const res = await request(app).post('/users').set('Authorization', `Bearer ${adminToken}`).send(validBody)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })

  it('returns 409 when email already exists', async () => {
    userService.createUser.mockRejectedValueOnce(new Error('EMAIL_EXISTS'))
    const res = await request(app).post('/users').set('Authorization', `Bearer ${adminToken}`).send(validBody)
    expect(res.status).toBe(409)
  })

  it('returns 400 when password is missing from body (schema rejects)', async () => {
    // Schema validation catches missing password — createUser is never called
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@example.com', first_name: 'New', last_name: 'User' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when service throws PASSWORD_REQUIRED', async () => {
    userService.createUser.mockRejectedValueOnce(new Error('PASSWORD_REQUIRED'))
    const res = await request(app).post('/users').set('Authorization', `Bearer ${adminToken}`).send(validBody)
    expect(res.status).toBe(400)
  })

  it('returns 500 on unexpected error', async () => {
    userService.createUser.mockRejectedValueOnce(new Error('DB_ERROR'))
    const res = await request(app).post('/users').set('Authorization', `Bearer ${adminToken}`).send(validBody)
    expect(res.status).toBe(500)
  })
})

// ── GET /users/:id (owner or admin) ──────────────────────────────────────────

describe('GET /users/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/users/user-1')
    expect(res.status).toBe(401)
  })

  it('returns 403 when user tries to access another user', async () => {
    const res = await request(app).get('/users/other-user').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 when owner accesses their own profile', async () => {
    userService.getUserById.mockResolvedValueOnce(sampleUser)
    const res = await request(app).get('/users/user-1').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.user_id).toBe('user-1')
  })

  it('returns 200 when admin accesses any user', async () => {
    userService.getUserById.mockResolvedValueOnce(sampleUser)
    const res = await request(app).get('/users/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 404 when user is not found', async () => {
    userService.getUserById.mockResolvedValueOnce(null)
    const res = await request(app).get('/users/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    userService.getUserById.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/users/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── PUT /users/:id (owner or admin) ──────────────────────────────────────────

describe('PUT /users/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).put('/users/user-1').send({ first_name: 'Updated' })
    expect(res.status).toBe(401)
  })

  it('returns 200 when owner updates their own profile', async () => {
    userService.updateUser.mockResolvedValueOnce({ ...sampleUser, first_name: 'Updated' })
    const res = await request(app)
      .put('/users/user-1')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ first_name: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.data.first_name).toBe('Updated')
  })

  it('returns 200 when admin updates any user', async () => {
    userService.updateUser.mockResolvedValueOnce({ ...sampleUser, role_type: 'PREMIUM' })
    const res = await request(app)
      .put('/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role_type: 'PREMIUM' })
    expect(res.status).toBe(200)
  })

  it('returns 404 when user is not found', async () => {
    userService.updateUser.mockResolvedValueOnce(null)
    const res = await request(app)
      .put('/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ first_name: 'Updated' })
    expect(res.status).toBe(404)
  })

  it('returns 409 when email is taken', async () => {
    userService.updateUser.mockRejectedValueOnce(new Error('EMAIL_EXISTS'))
    const res = await request(app)
      .put('/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'taken@example.com' })
    expect(res.status).toBe(409)
  })

  it('returns 400 when there are no fields to update', async () => {
    userService.updateUser.mockRejectedValueOnce(new Error('NO_FIELDS_TO_UPDATE'))
    const res = await request(app)
      .put('/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ first_name: 'Updated' })
    expect(res.status).toBe(400)
  })

  it('returns 500 on unexpected error', async () => {
    userService.updateUser.mockRejectedValueOnce(new Error('DB_ERROR'))
    const res = await request(app)
      .put('/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ first_name: 'Updated' })
    expect(res.status).toBe(500)
  })
})

// ── DELETE /users/:id (soft delete, owner or admin) ───────────────────────────

describe('DELETE /users/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).delete('/users/user-1')
    expect(res.status).toBe(401)
  })

  it('returns 200 when admin soft-deletes a user', async () => {
    userService.softDeleteUser.mockResolvedValueOnce({ user_id: 'user-1' })
    const res = await request(app).delete('/users/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 when user is not found', async () => {
    userService.softDeleteUser.mockResolvedValueOnce(null)
    const res = await request(app).delete('/users/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    userService.softDeleteUser.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).delete('/users/user-1').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── DELETE /users/:id/hard (admin only) ───────────────────────────────────────

describe('DELETE /users/:id/hard', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).delete('/users/user-1/hard')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    const res = await request(app).delete('/users/user-1/hard').set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 when admin hard-deletes a user', async () => {
    userService.hardDeleteUser.mockResolvedValueOnce({ user_id: 'user-1' })
    const res = await request(app).delete('/users/user-1/hard').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
  })

  it('returns 404 when user is not found', async () => {
    userService.hardDeleteUser.mockResolvedValueOnce(null)
    const res = await request(app).delete('/users/user-1/hard').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    userService.hardDeleteUser.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).delete('/users/user-1/hard').set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(500)
  })
})

// ── PUT /users/:id/password ───────────────────────────────────────────────────

describe('PUT /users/:id/password', () => {
  const passwordBody = { current_password: 'OldPass1', new_password: 'NewPass1' }

  it('returns 401 without token', async () => {
    const res = await request(app).put('/users/user-1/password').send(passwordBody)
    expect(res.status).toBe(401)
  })

  it('returns 400 when current_password is missing', async () => {
    const res = await request(app)
      .put('/users/user-1/password')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ new_password: 'NewPass1' })
    expect(res.status).toBe(400)
  })

  it('returns 200 when password is successfully changed', async () => {
    authService.changePassword.mockResolvedValueOnce(true)
    const res = await request(app)
      .put('/users/user-1/password')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(passwordBody)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 when user is not found', async () => {
    authService.changePassword.mockRejectedValueOnce(new Error('USER_NOT_FOUND'))
    const res = await request(app)
      .put('/users/user-1/password')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(passwordBody)
    expect(res.status).toBe(404)
  })

  it('returns 400 when current password is wrong', async () => {
    authService.changePassword.mockRejectedValueOnce(new Error('INVALID_PASSWORD'))
    const res = await request(app)
      .put('/users/user-1/password')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(passwordBody)
    expect(res.status).toBe(400)
  })

  it('returns 500 on unexpected error', async () => {
    authService.changePassword.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .put('/users/user-1/password')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(passwordBody)
    expect(res.status).toBe(500)
  })
})

// ── PATCH /users/:id/social-profile ──────────────────────────────────────────

describe('PATCH /users/:id/social-profile', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).patch('/users/user-1/social-profile').send({ display_name: 'NewName' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when display_name is empty string', async () => {
    const res = await request(app)
      .patch('/users/user-1/social-profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ display_name: '   ' })
    expect(res.status).toBe(400)
  })

  it('returns 200 when display_name is updated', async () => {
    userService.updateSocialProfile.mockResolvedValueOnce({ ...sampleUser, display_name: 'NewName' })
    const res = await request(app)
      .patch('/users/user-1/social-profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ display_name: 'NewName' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 when user is not found', async () => {
    userService.updateSocialProfile.mockResolvedValueOnce(null)
    const res = await request(app)
      .patch('/users/user-1/social-profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ display_name: 'NewName' })
    expect(res.status).toBe(404)
  })

  it('returns 200 when an avatar image is attached along with the update', async () => {
    storageService.uploadFile.mockResolvedValueOnce('https://cdn.example.com/avatar.jpg')
    userService.updateSocialProfile.mockResolvedValueOnce({ ...sampleUser, avatar_url: 'https://cdn.example.com/avatar.jpg' })
    const res = await request(app)
      .patch('/users/user-1/social-profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('display_name', 'NewName')
      .attach('avatar', Buffer.from('fake image'), { filename: 'avatar.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 on unexpected error', async () => {
    userService.updateSocialProfile.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .patch('/users/user-1/social-profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ display_name: 'NewName' })
    expect(res.status).toBe(500)
  })
})

// ── PUT /users/:id/avatar ─────────────────────────────────────────────────────

describe('PUT /users/:id/avatar', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).put('/users/user-1/avatar')
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file is provided', async () => {
    const res = await request(app)
      .put('/users/user-1/avatar')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('returns 400 when an unsupported file type is uploaded', async () => {
    const res = await request(app)
      .put('/users/user-1/avatar')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('avatar', Buffer.from('fake pdf'), { filename: 'doc.pdf', contentType: 'application/pdf' })
    expect(res.status).toBe(400)
  })

  it('returns 200 and the avatar_url when upload succeeds', async () => {
    storageService.uploadFile.mockResolvedValueOnce('https://cdn.example.com/avatar.jpg')
    userService.updateAvatarUrl.mockResolvedValueOnce(undefined)
    const res = await request(app)
      .put('/users/user-1/avatar')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('avatar', Buffer.from('fake image'), { filename: 'avatar.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.avatar_url).toBe('https://cdn.example.com/avatar.jpg')
  })

  it('returns 404 when user is not found', async () => {
    storageService.uploadFile.mockResolvedValueOnce('https://cdn.example.com/avatar.jpg')
    userService.updateAvatarUrl.mockRejectedValueOnce(new Error('USER_NOT_FOUND'))
    const res = await request(app)
      .put('/users/user-1/avatar')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('avatar', Buffer.from('fake image'), { filename: 'avatar.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(404)
  })

  it('returns 500 on unexpected error', async () => {
    storageService.uploadFile.mockRejectedValueOnce(new Error('S3 error'))
    const res = await request(app)
      .put('/users/user-1/avatar')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('avatar', Buffer.from('fake image'), { filename: 'avatar.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(500)
  })
})
