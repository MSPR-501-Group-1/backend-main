import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../../db.js'

const mockQuery = vi.mocked(db.query)

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateSocialProfile,
  softDeleteUser,
  updateAvatarUrl,
  hardDeleteUser,
} from '../../services/userService/user.service.js'

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getUsers ────────────────────────────────────────────────────────────────

  describe('getUsers', () => {
    it('returns all users', async () => {
      const users = [{ user_id: '1', email: 'a@b.com', role_type: 'FREEMIUM' }]
      mockQuery.mockResolvedValueOnce({ rows: users })
      const result = await getUsers()
      expect(result).toEqual(users)
    })

    it('returns empty array when no users exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      const result = await getUsers()
      expect(result).toEqual([])
    })
  })

  // ── getUserById ─────────────────────────────────────────────────────────────

  describe('getUserById', () => {
    it('returns the user when found', async () => {
      const user = { user_id: '1', email: 'a@b.com', role_type: 'FREEMIUM' }
      mockQuery.mockResolvedValueOnce({ rows: [user] })
      const result = await getUserById('1')
      expect(result).toEqual(user)
    })

    it('returns null when user is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      const result = await getUserById('999')
      expect(result).toBeNull()
    })
  })

  // ── createUser ──────────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('throws PASSWORD_REQUIRED when no password provided', async () => {
      await expect(createUser({ email: 'a@b.com' })).rejects.toThrow('PASSWORD_REQUIRED')
    })

    it('throws EMAIL_EXISTS when email is already taken', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: '99' }] }) // email check
      await expect(createUser({ email: 'taken@b.com', password: 'pass' })).rejects.toThrow('EMAIL_EXISTS')
    })

    it('creates user and returns it with role_type (default FREEMIUM)', async () => {
      const inserted = { user_id: 'uuid-1', email: 'new@b.com', first_name: 'J', last_name: 'D', role_id: 'ROLE_01' }
      mockQuery
        .mockResolvedValueOnce({ rows: [] })                           // email uniqueness check
        .mockResolvedValueOnce({ rows: [{ role_id: 'ROLE_01' }] })    // role lookup
        .mockResolvedValueOnce({ rows: [inserted] })                   // INSERT
        .mockResolvedValueOnce({ rows: [{ role_type: 'FREEMIUM' }] }) // role_type fetch
      const result = await createUser({ email: 'new@b.com', password: 'pass', first_name: 'J', last_name: 'D' })
      expect(result.email).toBe('new@b.com')
      expect(result.role_type).toBe('FREEMIUM')
    })

    it('falls back to ROLE_01 when role is not found in DB', async () => {
      const inserted = { user_id: 'uuid-2', email: 'x@b.com', role_id: 'ROLE_01' }
      mockQuery
        .mockResolvedValueOnce({ rows: [] })                           // email check
        .mockResolvedValueOnce({ rows: [] })                           // role lookup returns empty
        .mockResolvedValueOnce({ rows: [inserted] })                   // INSERT
        .mockResolvedValueOnce({ rows: [{ role_type: 'FREEMIUM' }] }) // role_type fetch
      const result = await createUser({ email: 'x@b.com', password: 'pass', first_name: 'A', last_name: 'B', is_active: true })
      expect(result).toBeDefined()
    })
  })

  // ── updateUser ──────────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('throws NO_FIELDS_TO_UPDATE when no allowed fields are provided', async () => {
      await expect(updateUser('1', { foo: 'bar' })).rejects.toThrow('NO_FIELDS_TO_UPDATE')
    })

    it('throws EMAIL_EXISTS when new email conflicts with another user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: '99' }] }) // email conflict
      await expect(updateUser('1', { email: 'taken@b.com' })).rejects.toThrow('EMAIL_EXISTS')
    })

    it('returns null when user is not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // no email conflict
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
      const result = await updateUser('1', { email: 'free@b.com' })
      expect(result).toBeNull()
    })

    it('resolves role_type to role_id before updating', async () => {
      const updatedUser = { user_id: '1', email: 'a@b.com', role_type: 'PREMIUM' }
      mockQuery
        .mockResolvedValueOnce({ rows: [{ role_id: 'ROLE_02' }] }) // role lookup
        .mockResolvedValueOnce({ rows: [{ user_id: '1' }] })       // UPDATE
        .mockResolvedValueOnce({ rows: [updatedUser] })             // getUserById
      const result = await updateUser('1', { role_type: 'PREMIUM' })
      expect(result).toMatchObject({ role_type: 'PREMIUM' })
    })

    it('updates non-email fields and returns the updated user', async () => {
      const updatedUser = { user_id: '1', first_name: 'Updated', role_type: 'FREEMIUM' }
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: '1' }] }) // UPDATE
        .mockResolvedValueOnce({ rows: [updatedUser] })       // getUserById
      const result = await updateUser('1', { first_name: 'Updated' })
      expect(result.first_name).toBe('Updated')
    })
  })

  // ── updateSocialProfile ─────────────────────────────────────────────────────

  describe('updateSocialProfile', () => {
    it('returns current user when no fields are provided', async () => {
      const user = { user_id: '1', display_name: 'Current' }
      mockQuery.mockResolvedValueOnce({ rows: [user] }) // getUserById
      const result = await updateSocialProfile('1', {})
      expect(result).toEqual(user)
    })

    it('updates display_name and returns refreshed user', async () => {
      const user = { user_id: '1', display_name: 'NewName' }
      mockQuery
        .mockResolvedValueOnce({ rows: [] })    // UPDATE
        .mockResolvedValueOnce({ rows: [user] }) // getUserById
      const result = await updateSocialProfile('1', { display_name: 'NewName' })
      expect(result.display_name).toBe('NewName')
    })

    it('updates avatar_url and returns refreshed user', async () => {
      const user = { user_id: '1', avatar_url: 'http://cdn.example.com/img.jpg' }
      mockQuery
        .mockResolvedValueOnce({ rows: [] })    // UPDATE
        .mockResolvedValueOnce({ rows: [user] }) // getUserById
      const result = await updateSocialProfile('1', { avatar_url: 'http://cdn.example.com/img.jpg' })
      expect(result.avatar_url).toBeDefined()
    })
  })

  // ── softDeleteUser ──────────────────────────────────────────────────────────

  describe('softDeleteUser', () => {
    it('returns the user_id record when user is deactivated', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: '1' }] })
      const result = await softDeleteUser('1')
      expect(result).toEqual({ user_id: '1' })
    })

    it('returns null when user is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      const result = await softDeleteUser('999')
      expect(result).toBeNull()
    })
  })

  // ── updateAvatarUrl ─────────────────────────────────────────────────────────

  describe('updateAvatarUrl', () => {
    it('returns true when avatar is updated', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: '1' }] })
      const result = await updateAvatarUrl('1', 'http://example.com/avatar.jpg')
      expect(result).toBe(true)
    })

    it('throws USER_NOT_FOUND when user does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      await expect(updateAvatarUrl('999', 'http://example.com/avatar.jpg')).rejects.toThrow('USER_NOT_FOUND')
    })
  })

  // ── hardDeleteUser ──────────────────────────────────────────────────────────

  describe('hardDeleteUser', () => {
    it('returns the deleted user_id record', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: '1' }] })
      const result = await hardDeleteUser('1')
      expect(result).toEqual({ user_id: '1' })
    })

    it('returns null when user does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })
      const result = await hardDeleteUser('999')
      expect(result).toBeNull()
    })
  })
})
