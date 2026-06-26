import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { db } from '../../db.js'

const mockQuery = vi.mocked(db.query)

import {
  getEtlById,
  getEtlExecutions,
  launchEtlPipeline,
  pushEtlData,
  replayDlqCorrections,
  updateEtlStatus,
  markEtlAsLoaded,
  markEtlAsRejected,
  deleteEtlExecution,
} from '../../services/etlService/etl.service.js'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const okResponse = (data) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(''),
  statusText: 'OK',
})

const errorResponse = (status, text = 'error') => ({
  ok: false,
  status,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(text),
  statusText: 'Error',
})

// ── DB-backed functions ──────────────────────────────────────────────────────

describe('etl.service - getEtlById', () => {
  it('returns the execution when found', async () => {
    const exec = { id: 'exec-1', name: 'nutrition', status: 'LOADED' }
    mockQuery.mockResolvedValueOnce({ rows: [exec] })
    const result = await getEtlById('exec-1')
    expect(result).toEqual(exec)
  })

  it('returns null when execution is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const result = await getEtlById('missing')
    expect(result).toBeNull()
  })
})

describe('etl.service - getEtlExecutions', () => {
  it('returns all executions', async () => {
    const execs = [{ id: 'exec-1' }, { id: 'exec-2' }]
    mockQuery.mockResolvedValueOnce({ rows: execs })
    const result = await getEtlExecutions()
    expect(result).toEqual(execs)
  })

  it('returns empty array when no executions exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const result = await getEtlExecutions()
    expect(result).toEqual([])
  })
})

describe('etl.service - updateEtlStatus', () => {
  it('returns updated execution', async () => {
    const exec = { id: 'exec-1', status: 'LOADED' }
    mockQuery.mockResolvedValueOnce({ rows: [exec] })
    const result = await updateEtlStatus('exec-1', 'loaded')
    expect(result.status).toBe('LOADED')
  })

  it('returns null when execution is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const result = await updateEtlStatus('missing', 'LOADED')
    expect(result).toBeNull()
  })
})

describe('etl.service - markEtlAsLoaded', () => {
  it('marks execution as LOADED', async () => {
    const exec = { id: 'exec-1', status: 'LOADED' }
    mockQuery.mockResolvedValueOnce({ rows: [exec] })
    const result = await markEtlAsLoaded('exec-1')
    expect(result).toEqual(exec)
  })

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    expect(await markEtlAsLoaded('missing')).toBeNull()
  })
})

describe('etl.service - markEtlAsRejected', () => {
  it('marks execution as REJECTED', async () => {
    const exec = { id: 'exec-1', status: 'REJECTED' }
    mockQuery.mockResolvedValueOnce({ rows: [exec] })
    const result = await markEtlAsRejected('exec-1')
    expect(result.status).toBe('REJECTED')
  })

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    expect(await markEtlAsRejected('missing')).toBeNull()
  })
})

describe('etl.service - deleteEtlExecution', () => {
  it('returns deleted execution id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'exec-1' }] })
    const result = await deleteEtlExecution('exec-1')
    expect(result).toEqual({ id: 'exec-1' })
  })

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    expect(await deleteEtlExecution('missing')).toBeNull()
  })
})

// ── API-backed functions ─────────────────────────────────────────────────────

describe('etl.service - launchEtlPipeline', () => {
  it('calls the ETL API and returns JSON response', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ execution_id: 'exec-1', status: 'RUNNING' }))
    const result = await launchEtlPipeline('nutrition')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/pipelines/nutrition/transform'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result).toMatchObject({ execution_id: 'exec-1' })
  })

  it('throws when the ETL API returns an error', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, 'Server Error'))
    await expect(launchEtlPipeline('nutrition')).rejects.toThrow('ETL API call failed')
  })
})

describe('etl.service - pushEtlData', () => {
  it('calls the ETL load endpoint and returns response', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ loaded: true }))
    const result = await pushEtlData('exec-1', 'nutrition')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/pipelines/nutrition/load/exec-1'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result).toMatchObject({ loaded: true })
  })

  it('throws when the ETL API returns an error', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(404, 'Not Found'))
    await expect(pushEtlData('bad-id', 'nutrition')).rejects.toThrow('ETL API call failed')
  })
})

describe('etl.service - replayDlqCorrections', () => {
  it('throws when sourceTable is missing', async () => {
    await expect(replayDlqCorrections({ executionId: 'exec-1' })).rejects.toThrow('sourceTable and executionId are required')
  })

  it('throws when executionId is missing', async () => {
    await expect(replayDlqCorrections({ sourceTable: 'ingredient' })).rejects.toThrow('sourceTable and executionId are required')
  })

  it('calls the DLQ replay endpoint and returns response', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ replayed: 5 }))
    const result = await replayDlqCorrections({ sourceTable: 'ingredient', executionId: 'exec-1' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/dlq/replay/'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result).toMatchObject({ replayed: 5 })
  })
})
