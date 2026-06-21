import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../services/socialService/social.service.js', () => ({
  getPosts: vi.fn(),
  createPost: vi.fn(),
  deletePost: vi.fn(),
}))
vi.mock('../../services/storageService/storage.service.js', () => ({
  uploadFile: vi.fn(),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_MEDIA_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'],
}))

import request from 'supertest'
import app from '../../app.js'
import * as socialService from '../../services/socialService/social.service.js'
import * as storageService from '../../services/storageService/storage.service.js'

const userToken = jwt.sign(
  { user_id: 'user-1', email: 'user@example.com', role_type: 'FREEMIUM' },
  'test-secret',
  { expiresIn: '1h' }
)
const adminToken = jwt.sign(
  { user_id: 'admin-1', email: 'admin@example.com', role_type: 'ADMIN' },
  'test-secret',
  { expiresIn: '1h' }
)

const samplePost = { post_id: 'post-1', user_id: 'user-1', text: 'Hello', media: [] }

beforeEach(() => vi.clearAllMocks())

// ── GET /posts ────────────────────────────────────────────────────────────────

describe('GET /posts', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/posts')
    expect(res.status).toBe(401)
  })

  it('returns 200 with posts feed', async () => {
    socialService.getPosts.mockResolvedValueOnce([samplePost])
    const res = await request(app).get('/posts').set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns 500 when service throws', async () => {
    socialService.getPosts.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app).get('/posts').set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(500)
  })
})

// ── POST /posts ───────────────────────────────────────────────────────────────

describe('POST /posts', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/posts').send({ text: 'Hello' })
    expect(res.status).toBe(401)
  })

  it('returns 201 when post is created with text only', async () => {
    socialService.createPost.mockResolvedValueOnce(samplePost)
    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .field('text', 'Hello world')
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })

  it('returns 201 when post is created with an image attachment', async () => {
    storageService.uploadFile.mockResolvedValueOnce('https://cdn.example.com/post.jpg')
    socialService.createPost.mockResolvedValueOnce({ ...samplePost, media: [{ media_url: 'https://cdn.example.com/post.jpg' }] })
    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .field('text', 'Photo post')
      .attach('media', Buffer.from('fake image'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(201)
  })

  it('returns 400 when POST_EMPTY error is thrown', async () => {
    socialService.createPost.mockRejectedValueOnce(new Error('POST_EMPTY'))
    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .field('text', '')
    expect(res.status).toBe(400)
  })

  it('returns 400 when an unsupported media type is uploaded', async () => {
    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .field('text', 'Some text')
      .attach('media', Buffer.from('fake pdf'), { filename: 'doc.pdf', contentType: 'application/pdf' })
    expect(res.status).toBe(400)
  })

  it('returns 500 when service throws unexpectedly', async () => {
    socialService.createPost.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .field('text', 'Hello')
    expect(res.status).toBe(500)
  })
})

// ── DELETE /posts/:id ─────────────────────────────────────────────────────────

describe('DELETE /posts/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).delete('/posts/post-1')
    expect(res.status).toBe(401)
  })

  it('returns 200 when post is deleted', async () => {
    socialService.deletePost.mockResolvedValueOnce(undefined)
    const res = await request(app)
      .delete('/posts/post-1')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 when post is not found', async () => {
    socialService.deletePost.mockRejectedValueOnce(new Error('POST_NOT_FOUND'))
    const res = await request(app)
      .delete('/posts/post-1')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not the post owner', async () => {
    socialService.deletePost.mockRejectedValueOnce(new Error('FORBIDDEN'))
    const res = await request(app)
      .delete('/posts/post-1')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 500 when service throws unexpectedly', async () => {
    socialService.deletePost.mockRejectedValueOnce(new Error('DB error'))
    const res = await request(app)
      .delete('/posts/post-1')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(500)
  })
})
