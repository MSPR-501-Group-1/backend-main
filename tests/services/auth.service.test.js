import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { db } from '../../db.js'

const mockQuery = vi.mocked(db.query)

// Import after mocks are in place
import { login, changePassword } from '../../services/authService/auth.service.js'

describe('auth.service - login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws INVALID_CREDENTIALS when user is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await expect(login('unknown@example.com', 'pass')).rejects.toThrow('INVALID_CREDENTIALS')
  })

  it('throws ACCOUNT_DISABLED when user account is inactive', async () => {
    const hash = await bcrypt.hash('Password1', 4)
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 1, email: 'user@example.com', password_hash: hash, is_active: false }],
    })
    await expect(login('user@example.com', 'Password1')).rejects.toThrow('ACCOUNT_DISABLED')
  })

  it('throws INVALID_CREDENTIALS when password does not match', async () => {
    const hash = await bcrypt.hash('correctpass', 4)
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 1, email: 'user@example.com', password_hash: hash, is_active: true }],
    })
    await expect(login('user@example.com', 'wrongpass')).rejects.toThrow('INVALID_CREDENTIALS')
  })

  it('returns the user row when credentials are valid', async () => {
    const hash = await bcrypt.hash('Password1', 4)
    const user = { user_id: 1, email: 'user@example.com', password_hash: hash, is_active: true, role_type: 'FREEMIUM' }
    mockQuery.mockResolvedValueOnce({ rows: [user] })

    const result = await login('user@example.com', 'Password1')
    expect(result).toMatchObject({ user_id: 1, email: 'user@example.com', role_type: 'FREEMIUM' })
  })
})

describe('auth.service - changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await expect(changePassword(1, 'current', 'NewPass1!')).rejects.toThrow('USER_NOT_FOUND')
  })

  it('throws INVALID_PASSWORD when current password is wrong', async () => {
    const hash = await bcrypt.hash('correctpass', 4)
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: hash }] })
    await expect(changePassword(1, 'wrongpass', 'NewPass1!')).rejects.toThrow('INVALID_PASSWORD')
  })

  it('updates the password and returns true when current password is correct', async () => {
    const hash = await bcrypt.hash('currentpass', 4)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ password_hash: hash }] }) // SELECT
      .mockResolvedValueOnce({ rows: [] })                        // UPDATE

    const result = await changePassword(1, 'currentpass', 'NewPass1!')
    expect(result).toBe(true)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
})
