import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  authenticate,
  requireRole,
  requireOwnerOrAdmin,
  validate,
} from '../../middlewares/auth.middleware.js'
import { loginSchema } from '../../schemas/auth.schema.js'

const SECRET = process.env.JWT_SECRET

const mockReq = (overrides = {}) => ({
  headers: {},
  params: {},
  body: {},
  ...overrides,
})

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const mockNext = () => vi.fn()

describe('authenticate', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = mockReq()
    const res = mockRes()
    const next = mockNext()

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when header does not start with Bearer', () => {
    const req = mockReq({ headers: { authorization: 'Basic abc123' } })
    const res = mockRes()
    const next = mockNext()

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 with "Token invalide" for a malformed token', () => {
    const req = mockReq({ headers: { authorization: 'Bearer not.a.real.token' } })
    const res = mockRes()
    const next = mockNext()

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token invalide' })
    )
  })

  it('returns 401 with "Token expiré" for an expired token', () => {
    const token = jwt.sign(
      { user_id: 1, email: 'a@b.com', role_type: 'FREEMIUM' },
      SECRET,
      { expiresIn: -1 }
    )
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res = mockRes()
    const next = mockNext()

    authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token expiré' })
    )
  })

  it('calls next and attaches decoded payload to req.user for a valid token', () => {
    const payload = { user_id: 42, email: 'test@example.com', role_type: 'ADMIN' }
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' })
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res = mockRes()
    const next = mockNext()

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toMatchObject(payload)
  })
})

describe('requireRole', () => {
  it('returns 401 when req.user is absent', () => {
    const req = mockReq()
    const res = mockRes()
    const next = mockNext()

    requireRole('ADMIN')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when user role is not in the allowed list', () => {
    const req = mockReq({ user: { role_type: 'FREEMIUM' } })
    const res = mockRes()
    const next = mockNext()

    requireRole('ADMIN', 'PREMIUM')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next when user role is in the allowed list', () => {
    const req = mockReq({ user: { role_type: 'PREMIUM' } })
    const res = mockRes()
    const next = mockNext()

    requireRole('ADMIN', 'PREMIUM')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('calls next for any authenticated user when no roles are specified', () => {
    const req = mockReq({ user: { role_type: 'FREEMIUM' } })
    const res = mockRes()
    const next = mockNext()

    requireRole()(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })
})

describe('requireOwnerOrAdmin', () => {
  it('calls next for an admin regardless of resource id', () => {
    const req = mockReq({ user: { role_type: 'ADMIN', user_id: 1 }, params: { id: '999' } })
    const res = mockRes()
    const next = mockNext()

    requireOwnerOrAdmin(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('calls next for the resource owner', () => {
    const req = mockReq({ user: { role_type: 'FREEMIUM', user_id: '42' }, params: { id: '42' } })
    const res = mockRes()
    const next = mockNext()

    requireOwnerOrAdmin(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 403 when user is neither owner nor admin', () => {
    const req = mockReq({ user: { role_type: 'FREEMIUM', user_id: '1' }, params: { id: '99' } })
    const res = mockRes()
    const next = mockNext()

    requireOwnerOrAdmin(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('validate', () => {
  it('calls next and parses the body for a valid payload', () => {
    const req = mockReq({ body: { email: 'user@example.com', password: 'Password1' } })
    const res = mockRes()
    const next = mockNext()

    validate(loginSchema)(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid email', () => {
    const req = mockReq({ body: { email: 'not-an-email', password: 'Password1' } })
    const res = mockRes()
    const next = mockNext()

    validate(loginSchema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errors: expect.any(Array) })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 400 with a non-empty errors array when required fields are missing', () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    const next = mockNext()

    validate(loginSchema)(req, res, next)

    const response = res.json.mock.calls[0][0]
    expect(res.status).toHaveBeenCalledWith(400)
    expect(response.errors).toBeInstanceOf(Array)
    expect(response.errors.length).toBeGreaterThan(0)
  })
})
