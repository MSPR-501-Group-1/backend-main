import { vi } from 'vitest'

// Set before any module is evaluated so const JWT_SECRET = process.env.JWT_SECRET captures the value
process.env.JWT_SECRET = 'test-secret'
process.env.JWT_EXPIRES_IN = '1h'

// Prevent db.js from attempting a real Postgres connection on import
vi.mock('../db.js', () => ({
  db: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn(),
    end: vi.fn(),
  },
}))

// Prevent mongo.js from attempting a real MongoDB connection
vi.mock('../mongo.js', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOne: vi.fn(),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    }),
  }),
}))

// Prevent the ETL cron from scheduling on import
vi.mock('../cron/cronForEtl.js', () => ({}))
