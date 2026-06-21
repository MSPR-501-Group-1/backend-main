import { describe, it, expect } from 'vitest'
import {
  RANGE_INTERVALS,
  RANGE_DAYS,
  normalizeRange,
  hasBoundedRange,
  round1,
  safePercent,
  percentDelta,
  pointDelta,
  trendForVolume,
  trendForRate,
  currentWindowSql,
  previousWindowSql,
} from '../../services/analyticsService/analytics.utils.js'

// ── RANGE_INTERVALS / RANGE_DAYS ──────────────────────────────────────────────

describe('analytics.utils - constants', () => {
  it('RANGE_INTERVALS maps known keys correctly', () => {
    expect(RANGE_INTERVALS['7d']).toBe('7 days')
    expect(RANGE_INTERVALS['30d']).toBe('30 days')
    expect(RANGE_INTERVALS['90d']).toBe('90 days')
    expect(RANGE_INTERVALS['all']).toBeNull()
  })

  it('RANGE_DAYS maps known keys to numbers', () => {
    expect(RANGE_DAYS['7d']).toBe(7)
    expect(RANGE_DAYS['30d']).toBe(30)
    expect(RANGE_DAYS['90d']).toBe(90)
    expect(RANGE_DAYS['all']).toBeNull()
  })
})

// ── normalizeRange ────────────────────────────────────────────────────────────

describe('analytics.utils - normalizeRange', () => {
  it('returns a valid range unchanged', () => {
    expect(normalizeRange('7d')).toBe('7d')
    expect(normalizeRange('30d')).toBe('30d')
    expect(normalizeRange('90d')).toBe('90d')
    expect(normalizeRange('all')).toBe('all')
  })

  it('trims and lowercases the input', () => {
    expect(normalizeRange('  7D  ')).toBe('7d')
    expect(normalizeRange('ALL')).toBe('all')
  })

  it('returns the fallback for an unknown range string', () => {
    expect(normalizeRange('1y')).toBe('30d')
    expect(normalizeRange('')).toBe('30d')
  })

  it('returns the fallback when input is not a string', () => {
    expect(normalizeRange(null)).toBe('30d')
    expect(normalizeRange(undefined)).toBe('30d')
    expect(normalizeRange(7)).toBe('30d')
  })

  it('uses a custom fallback when provided', () => {
    expect(normalizeRange('invalid', '7d')).toBe('7d')
  })
})

// ── hasBoundedRange ───────────────────────────────────────────────────────────

describe('analytics.utils - hasBoundedRange', () => {
  it('returns true for bounded ranges', () => {
    expect(hasBoundedRange('7d')).toBe(true)
    expect(hasBoundedRange('30d')).toBe(true)
    expect(hasBoundedRange('90d')).toBe(true)
  })

  it('returns false for "all" (unbounded)', () => {
    expect(hasBoundedRange('all')).toBe(false)
  })
})

// ── round1 ────────────────────────────────────────────────────────────────────

describe('analytics.utils - round1', () => {
  it('rounds to one decimal place', () => {
    expect(round1(1.25)).toBe(1.3)
    expect(round1(1.24)).toBe(1.2)
    expect(round1(10)).toBe(10)
  })

  it('treats falsy values as 0', () => {
    expect(round1(null)).toBe(0)
    expect(round1(undefined)).toBe(0)
    expect(round1(0)).toBe(0)
  })
})

// ── safePercent ───────────────────────────────────────────────────────────────

describe('analytics.utils - safePercent', () => {
  it('computes the percentage correctly', () => {
    expect(safePercent(1, 4)).toBe(25)
    expect(safePercent(3, 3)).toBe(100)
  })

  it('returns 0 when denominator is 0', () => {
    expect(safePercent(5, 0)).toBe(0)
  })

  it('returns 0 when denominator is negative', () => {
    expect(safePercent(5, -1)).toBe(0)
  })

  it('returns 0 for non-finite values', () => {
    expect(safePercent(Infinity, 10)).toBe(0)
    expect(safePercent(10, Infinity)).toBe(0)
  })

  it('treats null/undefined as 0', () => {
    expect(safePercent(null, 4)).toBe(0)
    expect(safePercent(4, null)).toBe(0)
  })
})

// ── percentDelta ──────────────────────────────────────────────────────────────

describe('analytics.utils - percentDelta', () => {
  it('computes percentage change correctly', () => {
    expect(percentDelta(110, 100)).toBe(10)
    expect(percentDelta(90, 100)).toBe(-10)
  })

  it('returns null when previous is null or undefined', () => {
    expect(percentDelta(100, null)).toBeNull()
    expect(percentDelta(100, undefined)).toBeNull()
  })

  it('returns null when previous is 0 (division by zero)', () => {
    expect(percentDelta(50, 0)).toBeNull()
  })

  it('returns null for non-finite inputs', () => {
    expect(percentDelta(Infinity, 100)).toBeNull()
    expect(percentDelta(100, Infinity)).toBeNull()
  })
})

// ── pointDelta ────────────────────────────────────────────────────────────────

describe('analytics.utils - pointDelta', () => {
  it('computes point difference correctly', () => {
    expect(pointDelta(7.5, 5)).toBe(2.5)
    expect(pointDelta(3, 5)).toBe(-2)
  })

  it('returns null when previous is null or undefined', () => {
    expect(pointDelta(5, null)).toBeNull()
    expect(pointDelta(5, undefined)).toBeNull()
  })

  it('returns null for non-finite values', () => {
    expect(pointDelta(Infinity, 5)).toBeNull()
    expect(pointDelta(5, Infinity)).toBeNull()
  })
})

// ── trendForVolume / trendForRate ─────────────────────────────────────────────

describe('analytics.utils - trendForVolume', () => {
  it('returns percentDelta for bounded ranges', () => {
    expect(trendForVolume('7d', 110, 100)).toBe(10)
  })

  it('returns null for unbounded range "all"', () => {
    expect(trendForVolume('all', 110, 100)).toBeNull()
  })
})

describe('analytics.utils - trendForRate', () => {
  it('returns pointDelta for bounded ranges', () => {
    expect(trendForRate('30d', 7.5, 5)).toBe(2.5)
  })

  it('returns null for unbounded range "all"', () => {
    expect(trendForRate('all', 7.5, 5)).toBeNull()
  })
})

// ── currentWindowSql / previousWindowSql ─────────────────────────────────────

describe('analytics.utils - currentWindowSql', () => {
  it('returns a SQL fragment for bounded ranges', () => {
    const sql = currentWindowSql('created_at', '30d')
    expect(sql).toContain('created_at')
    expect(sql).toContain('$1::interval')
  })

  it('returns an empty string for unbounded range "all"', () => {
    expect(currentWindowSql('created_at', 'all')).toBe('')
  })
})

describe('analytics.utils - previousWindowSql', () => {
  it('returns a SQL fragment for bounded ranges', () => {
    const sql = previousWindowSql('created_at', '7d')
    expect(sql).toContain('created_at')
    expect(sql).toContain('$1::interval')
  })

  it('returns an empty string for unbounded range "all"', () => {
    expect(previousWindowSql('created_at', 'all')).toBe('')
  })
})
