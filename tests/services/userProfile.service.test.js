import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../../db.js'

const mockConnect = vi.mocked(db.connect)

// Mock client returned by db.connect() — supports transactions
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
}

import {
  getUserProfileById,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from '../../services/userService/userProfile.service.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.query.mockReset()
  mockClient.release.mockReset()
  mockConnect.mockResolvedValue(mockClient)
  // Default: all queries return empty rows (covers BEGIN / COMMIT / ROLLBACK)
  mockClient.query.mockResolvedValue({ rows: [] })
  mockClient.release.mockResolvedValue(undefined)
})

// ── getUserProfileById ────────────────────────────────────────────────────────

describe('userProfile.service - getUserProfileById', () => {
  it('returns null when no profile row exists', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] }) // SELECT user_metrics
    const result = await getUserProfileById('user-1')
    expect(result).toBeNull()
    expect(mockClient.release).toHaveBeenCalled()
  })

  it('returns the profile payload when a row exists', async () => {
    const row = { metric_id: 'm-1', user_id: 'user-1', height_cm: 175, weight_kg: 70 }
    mockClient.query.mockResolvedValueOnce({ rows: [row] }) // SELECT user_metrics
    const result = await getUserProfileById('user-1')
    expect(result).toMatchObject({ metric_id: 'm-1', user_id: 'user-1', height_cm: 175 })
    expect(mockClient.release).toHaveBeenCalled()
  })
})

// ── createUserProfile ─────────────────────────────────────────────────────────

describe('userProfile.service - createUserProfile', () => {
  it('throws USER_NOT_FOUND and rolls back when user does not exist', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT user_ (not found)
    await expect(createUserProfile('user-1', {})).rejects.toThrow('USER_NOT_FOUND')
    // ROLLBACK should have been called
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
    expect(mockClient.release).toHaveBeenCalled()
  })

  it('inserts the profile and returns the payload on success', async () => {
    const row = { metric_id: 'm-1', user_id: 'user-1', height_cm: 175 }
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                      // BEGIN
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }] }) // SELECT user_ (found)
      .mockResolvedValueOnce({ rows: [row] })                   // INSERT RETURNING *
      .mockResolvedValueOnce({ rows: [] })                      // COMMIT
    const result = await createUserProfile('user-1', { height_cm: 175 })
    expect(result).toMatchObject({ metric_id: 'm-1', height_cm: 175 })
    expect(mockClient.release).toHaveBeenCalled()
  })

  it('accepts a custom metric_id from data', async () => {
    const row = { metric_id: 'custom-id', user_id: 'user-1' }
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [] })
    const result = await createUserProfile('user-1', { metric_id: 'custom-id' })
    expect(result?.metric_id).toBe('custom-id')
  })
})

// ── updateUserProfile ─────────────────────────────────────────────────────────

describe('userProfile.service - updateUserProfile', () => {
  it('throws NO_FIELDS_TO_UPDATE when no metric fields are provided', async () => {
    await expect(updateUserProfile('user-1', {})).rejects.toThrow('NO_FIELDS_TO_UPDATE')
  })

  it('returns null when user is not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // SELECT user_ (not found)
    const result = await updateUserProfile('user-1', { height_cm: 180 })
    expect(result).toBeNull()
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
  })

  it('returns null when user has no existing metric record', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                      // BEGIN
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }] }) // SELECT user_ (found)
      .mockResolvedValueOnce({ rows: [] })                      // SELECT metric_id (none)
    const result = await updateUserProfile('user-1', { height_cm: 180 })
    expect(result).toBeNull()
  })

  it('updates the profile and returns the payload', async () => {
    const row = { metric_id: 'm-1', user_id: 'user-1', height_cm: 180 }
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                       // BEGIN
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }] }) // SELECT user_
      .mockResolvedValueOnce({ rows: [{ metric_id: 'm-1' }] })  // SELECT metric_id
      .mockResolvedValueOnce({ rows: [row] })                    // UPDATE RETURNING *
      .mockResolvedValueOnce({ rows: [] })                       // COMMIT
    const result = await updateUserProfile('user-1', { height_cm: 180 })
    expect(result).toMatchObject({ metric_id: 'm-1', height_cm: 180 })
  })
})

// ── deleteUserProfile ─────────────────────────────────────────────────────────

describe('userProfile.service - deleteUserProfile', () => {
  it('returns null when user is not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT user_ (not found)
    const result = await deleteUserProfile('user-1')
    expect(result).toBeNull()
  })

  it('returns null when user has no metrics', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                      // BEGIN
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }] }) // SELECT user_ (found)
      .mockResolvedValueOnce({ rows: [] })                      // SELECT metric_id (none)
    const result = await deleteUserProfile('user-1')
    expect(result).toBeNull()
  })

  it('deletes metrics and returns user_id on success', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                       // BEGIN
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }] }) // SELECT user_
      .mockResolvedValueOnce({ rows: [{ metric_id: 'm-1' }] })  // SELECT metric_id
      .mockResolvedValueOnce({ rows: [] })                       // DELETE
      .mockResolvedValueOnce({ rows: [] })                       // COMMIT
    const result = await deleteUserProfile('user-1')
    expect(result).toEqual({ user_id: 'user-1' })
    expect(mockClient.release).toHaveBeenCalled()
  })
})
