import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { db } from '../../db.js'
import { getMongoDb } from '../../mongo.js'

const mockQuery = vi.mocked(db.query)
const mockGetMongoDb = vi.mocked(getMongoDb)

import { predictWorkoutPlan } from '../../services/workoutService/workoutPrediction.service.js'

const mockFetch = vi.fn()

const metricsRow = {
  metric_id: 'm-1',
  user_id: 'u-1',
  recorded_at: new Date(),
  recorded_date: '2024-01-01',
  fatigue_score: 5,
  birth_date: '1990-06-15',
  age: '1990-06-15',
  weight: 70,
  height: 175,
}

const validPrediction = {
  recommended_program: 'strength',
  recommended_intensity: 'moderate',
  recommended_plan: [{ day: 1, exercises: ['squat'] }],
}

const okResponse = (data) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(''),
  statusText: 'OK',
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('workout.service - predictWorkoutPlan', () => {
  it('throws NO_METRICS_FOUND when user has no metrics', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await expect(predictWorkoutPlan({ userId: 'u-1', fatigueScore: 5 })).rejects.toThrow('NO_METRICS_FOUND')
  })

  it('returns recommendation when all steps succeed', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [metricsRow] })
    mockFetch.mockResolvedValueOnce(okResponse(validPrediction))

    const result = await predictWorkoutPlan({ userId: 'u-1', fatigueScore: 7 })

    expect(result).toMatchObject({
      recommended_program: 'strength',
      recommended_intensity: 'moderate',
      plan: expect.any(Array),
    })
    expect(mockGetMongoDb).toHaveBeenCalled()
  })

  it('throws IA_API_UNAVAILABLE on fetch network error', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [metricsRow] })
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    await expect(predictWorkoutPlan({ userId: 'u-1', fatigueScore: 5 })).rejects.toThrow('IA_API_UNAVAILABLE')
  })

  it('throws IA_API_UNAVAILABLE on non-2xx non-422 response', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [metricsRow] })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue('Service Unavailable'),
      statusText: 'Service Unavailable',
    })

    await expect(predictWorkoutPlan({ userId: 'u-1', fatigueScore: 5 })).rejects.toThrow('IA_API_UNAVAILABLE')
  })

  it('throws IA_API_VALIDATION on 422 response', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [metricsRow] })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: vi.fn().mockResolvedValue('Unprocessable Entity'),
    })

    await expect(predictWorkoutPlan({ userId: 'u-1', fatigueScore: 5 })).rejects.toThrow('IA_API_VALIDATION')
  })

  it('throws IA_RESPONSE_INVALID when prediction is missing required fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [metricsRow] })
    mockFetch.mockResolvedValueOnce(okResponse({ recommended_plan: [] })) // missing program and intensity

    await expect(predictWorkoutPlan({ userId: 'u-1', fatigueScore: 5 })).rejects.toThrow('IA_RESPONSE_INVALID')
  })

  it('handles prediction with no recommended_plan (defaults to empty array)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [metricsRow] })
    mockFetch.mockResolvedValueOnce(
      okResponse({ recommended_program: 'cardio', recommended_intensity: 'light' })
    )

    const result = await predictWorkoutPlan({ userId: 'u-1', fatigueScore: 3 })
    expect(result.plan).toEqual([])
  })
})
