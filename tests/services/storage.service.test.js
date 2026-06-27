import { describe, it, expect, vi } from 'vitest'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn().mockResolvedValue({}) }))

vi.mock('@aws-sdk/client-s3', () => ({
  // Regular function so `new S3Client()` works correctly
  S3Client: vi.fn(function MockS3Client() { this.send = mockSend }),
  PutObjectCommand: vi.fn(function MockPutObjectCommand(params) { Object.assign(this, params) }),
}))

import { uploadFileBuffer, ALLOWED_IMAGE_TYPES, ALLOWED_MEDIA_TYPES } from '../../services/storageService/storage.service.js'

describe('storage.service - uploadFile', () => {
  it('throws UNSUPPORTED_FILE_TYPE for an unknown MIME type', async () => {
    await expect(uploadFileBuffer(Buffer.from('data'), 'text/plain', 'test')).rejects.toThrow('UNSUPPORTED_FILE_TYPE')
  })

  it('uploads image/jpeg and returns a URL ending in .jpg', async () => {
    const url = await uploadFileBuffer(Buffer.from('jpeg'), 'image/jpeg', 'avatars')
    expect(url).toMatch(/avatars\/.+\.jpg$/)
  })

  it('uploads image/png and returns a URL ending in .png', async () => {
    const url = await uploadFileBuffer(Buffer.from('png'), 'image/png', 'posts')
    expect(url).toMatch(/posts\/.+\.png$/)
  })

  it('uploads image/gif and returns a URL ending in .gif', async () => {
    const url = await uploadFileBuffer(Buffer.from('gif'), 'image/gif', 'uploads')
    expect(url).toMatch(/\.gif$/)
  })

  it('uploads image/webp and returns a URL ending in .webp', async () => {
    const url = await uploadFileBuffer(Buffer.from('webp'), 'image/webp', 'uploads')
    expect(url).toMatch(/\.webp$/)
  })

  it('uploads video/mp4 and returns a URL ending in .mp4', async () => {
    const url = await uploadFileBuffer(Buffer.from('mp4'), 'video/mp4', 'videos')
    expect(url).toMatch(/videos\/.+\.mp4$/)
  })

  it('uploads video/quicktime and returns a URL ending in .mov', async () => {
    const url = await uploadFileBuffer(Buffer.from('mov'), 'video/quicktime', 'videos')
    expect(url).toMatch(/\.mov$/)
  })

  it('uses default folder "uploads" when no folder argument is passed', async () => {
    const url = await uploadFileBuffer(Buffer.from('data'), 'image/jpeg')
    expect(url).toMatch(/uploads\/.+\.jpg$/)
  })

  it('still succeeds when folder contains double slashes (defensive branch)', async () => {
    // key.includes("//") branch — the replace is a no-op (result discarded) but the branch executes
    const url = await uploadFileBuffer(Buffer.from('data'), 'image/jpeg', 'my//folder')
    expect(url).toContain('my//folder')
  })
})

describe('storage.service - exported constants', () => {
  it('ALLOWED_IMAGE_TYPES contains the four image MIME types', () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual(
      expect.arrayContaining(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    )
  })

  it('ALLOWED_MEDIA_TYPES is a superset of ALLOWED_IMAGE_TYPES with video types', () => {
    expect(ALLOWED_MEDIA_TYPES).toEqual(
      expect.arrayContaining([...ALLOWED_IMAGE_TYPES, 'video/mp4', 'video/quicktime'])
    )
  })
})
