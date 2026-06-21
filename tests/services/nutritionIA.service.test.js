import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMealPlan, analyzeMeal } from '../../services/nutritionIAService/nutritionIA.service.js'

const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockClear()
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const okJsonResponse = (body) => ({
  ok: true,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
  status: 200,
  statusText: 'OK',
})

const errorResponse = (status, body = '') => ({
  ok: false,
  status,
  statusText: 'Error',
  text: () => Promise.resolve(body),
})

// ── getMealPlan ───────────────────────────────────────────────────────────────

describe('nutritionIA.service - getMealPlan', () => {
  it('calls the IA endpoint and returns the meal plan', async () => {
    const plan = { days: 7, meals: [{ day: 1, lunch: 'Salad' }] }
    mockFetch.mockResolvedValueOnce(okJsonResponse(plan))

    const result = await getMealPlan('user-1', 7)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/v1/users/user-1/meal-plan?days=7')
    expect(result).toEqual(plan)
  })

  it('encodes the user id in the URL', async () => {
    mockFetch.mockResolvedValueOnce(okJsonResponse({}))
    await getMealPlan('user with spaces', 3)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('user%20with%20spaces')
  })

  it('throws when the IA service returns a non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(503, 'Service Unavailable'))
    await expect(getMealPlan('user-1', 7)).rejects.toThrow('503')
  })

  it('throws when fetch itself fails (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    await expect(getMealPlan('user-1', 7)).rejects.toThrow('ECONNREFUSED')
  })
})

// ── analyzeMeal ───────────────────────────────────────────────────────────────

describe('nutritionIA.service - analyzeMeal', () => {
  it('calls the IA endpoint with FormData and returns the analysis', async () => {
    const analysis = { calories: 450, protein: 25 }
    mockFetch.mockResolvedValueOnce(okJsonResponse(analysis))

    const result = await analyzeMeal('user-1', Buffer.from('fake image'), 'image/jpeg', 'meal.jpg')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/v1/users/user-1/analyze-meal')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(result).toEqual(analysis)
  })

  it('throws when the IA service returns an error', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(422, 'Invalid image'))
    await expect(analyzeMeal('user-1', Buffer.from('x'), 'image/png', 'x.png')).rejects.toThrow('422')
  })
})
