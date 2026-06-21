import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateAge } from '../../lib/calculateAge.js'

describe('calculateAge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for null', () => {
    expect(calculateAge(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(calculateAge(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(calculateAge('')).toBeNull()
  })

  it('returns null for an invalid date string', () => {
    expect(calculateAge('not-a-date')).toBeNull()
  })

  it('computes age from a date string (birthday already passed this year)', () => {
    // Born Jan 1, 1990 — birthday already passed (today is June 15)
    expect(calculateAge('1990-01-01')).toBe(34)
  })

  it('computes age from a Date object', () => {
    expect(calculateAge(new Date('1990-01-01'))).toBe(34)
  })

  it('returns full age when birthday is today', () => {
    expect(calculateAge('1990-06-15')).toBe(34)
  })

  it('subtracts one year when birthday has not occurred yet (same month, later day)', () => {
    // Born June 16, 1990 — birthday is tomorrow, so still 33
    expect(calculateAge('1990-06-16')).toBe(33)
  })

  it('subtracts one year when birthday is in a future month', () => {
    // Born July 1, 1990 — birthday not reached yet this year
    expect(calculateAge('1990-07-01')).toBe(33)
  })

  it('correctly handles age 0 (born today)', () => {
    expect(calculateAge('2024-06-15')).toBe(0)
  })
})
