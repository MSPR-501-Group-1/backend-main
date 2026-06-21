import { describe, it, expect, vi } from 'vitest'
import { validate, createUserProfileSchema } from '../../schemas/userProfile.schema.js'

const makeReqRes = (body = {}) => {
  const req = { body }
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  const next = vi.fn()
  return { req, res, next }
}

describe('userProfile.schema - exported schemas', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(() => createUserProfileSchema.parse({})).not.toThrow()
  })

  it('accepts valid profile data', () => {
    expect(() =>
      createUserProfileSchema.parse({
        height_cm: 175,
        weight_kg: 70,
        gender: 'Male',
        fitness_level: 'intermediate',
        health_goal: 'fat_loss',
        injury_type: 'none',
        injury_severity: 'none',
        medical_condition: 'none',
      })
    ).not.toThrow()
  })

  it('rejects an invalid gender value', () => {
    expect(() => createUserProfileSchema.parse({ gender: 'Other' })).toThrow()
  })

  it('rejects a negative height', () => {
    expect(() => createUserProfileSchema.parse({ height_cm: -10 })).toThrow()
  })

  it('rejects an invalid fitness level', () => {
    expect(() => createUserProfileSchema.parse({ fitness_level: 'expert' })).toThrow()
  })
})

describe('userProfile.schema - validate middleware', () => {
  it('calls next() when body is valid', () => {
    const { req, res, next } = makeReqRes({ height_cm: 175, weight_kg: 70 })
    validate(createUserProfileSchema)(req, res, next)
    expect(next).toHaveBeenCalledWith()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 400 when body contains invalid enum values', () => {
    const { req, res, next } = makeReqRes({ gender: 'Unknown' })
    validate(createUserProfileSchema)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 400 when a numeric field is the wrong type', () => {
    const { req, res, next } = makeReqRes({ height_cm: 'tall' })
    validate(createUserProfileSchema)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
