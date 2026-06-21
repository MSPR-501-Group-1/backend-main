import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../../db.js'

const mockQuery = vi.mocked(db.query)

import { getPosts, createPost, deletePost } from '../../services/socialService/social.service.js'

beforeEach(() => vi.clearAllMocks())

// ── getPosts ──────────────────────────────────────────────────────────────────

describe('social.service - getPosts', () => {
  it('returns the rows from the query', async () => {
    const rows = [{ post_id: 'p-1', text: 'Hello', user_id: 'u-1', media: [] }]
    mockQuery.mockResolvedValueOnce({ rows })
    const result = await getPosts()
    expect(result).toEqual(rows)
    expect(mockQuery).toHaveBeenCalledOnce()
  })

  it('returns an empty array when there are no posts', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const result = await getPosts()
    expect(result).toEqual([])
  })
})

// ── createPost ────────────────────────────────────────────────────────────────

describe('social.service - createPost', () => {
  it('throws POST_EMPTY when no text and no media', async () => {
    await expect(createPost('u-1', { text: null, mediaFiles: [] })).rejects.toThrow('POST_EMPTY')
  })

  it('creates a text-only post and returns it', async () => {
    const postRow = { post_id: 'p-1', user_id: 'u-1', text: 'Hello' }
    mockQuery.mockResolvedValueOnce({ rows: [postRow] }) // INSERT social_post
    const result = await createPost('u-1', { text: 'Hello', mediaFiles: [] })
    expect(result).toMatchObject({ post_id: 'p-1', text: 'Hello', media: [] })
    expect(mockQuery).toHaveBeenCalledOnce()
  })

  it('handles null mediaFiles (uses empty array fallback)', async () => {
    const postRow = { post_id: 'p-1', user_id: 'u-1', text: 'Hello' }
    mockQuery.mockResolvedValueOnce({ rows: [postRow] })
    const result = await createPost('u-1', { text: 'Hello', mediaFiles: null })
    expect(result.media).toEqual([])
  })

  it('creates a post with media files and inserts each media row', async () => {
    const postRow = { post_id: 'p-1', user_id: 'u-1', text: 'Photo post' }
    const mediaRow = { media_id: 'm-1', post_id: 'p-1', media_url: 'https://cdn/img.jpg', media_type: 'image' }
    mockQuery
      .mockResolvedValueOnce({ rows: [postRow] })    // INSERT social_post
      .mockResolvedValueOnce({ rows: [mediaRow] })   // INSERT social_post_media
    const result = await createPost('u-1', {
      text: 'Photo post',
      mediaFiles: [{ media_url: 'https://cdn/img.jpg', media_type: 'image' }],
    })
    expect(result.media).toHaveLength(1)
    expect(result.media[0].media_url).toBe('https://cdn/img.jpg')
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
})

// ── deletePost ────────────────────────────────────────────────────────────────

describe('social.service - deletePost', () => {
  it('throws POST_NOT_FOUND when post does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // SELECT check (not found)
    await expect(deletePost('p-1', 'u-1', 'FREEMIUM')).rejects.toThrow('POST_NOT_FOUND')
  })

  it('throws FORBIDDEN when user is not the owner and not an admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'other-user' }] }) // owner is different
    await expect(deletePost('p-1', 'u-1', 'FREEMIUM')).rejects.toThrow('FORBIDDEN')
  })

  it('deletes the post when the user is the owner', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'u-1' }] }) // check: owner matches
      .mockResolvedValueOnce({ rows: [] })                    // DELETE
    const result = await deletePost('p-1', 'u-1', 'FREEMIUM')
    expect(result).toBe(true)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('allows an admin to delete any post', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'other-user' }] }) // owner differs
      .mockResolvedValueOnce({ rows: [] })                           // DELETE
    const result = await deletePost('p-1', 'admin-1', 'ADMIN')
    expect(result).toBe(true)
  })
})
