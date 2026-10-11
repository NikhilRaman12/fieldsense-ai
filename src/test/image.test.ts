import { describe, it, expect } from 'vitest'
import { validateImageFile, MAX_IMAGE_SIZE_BYTES } from '../utils/imageUtils'

describe('Image Validation', () => {
  it('accepts valid JPEG, PNG, and WebP images within 5MB', () => {
    const validJpg = new File(['fake-jpg-content'], 'leaf.jpg', { type: 'image/jpeg' })
    const validPng = new File(['fake-png-content'], 'bark.png', { type: 'image/png' })
    const validWebp = new File(['fake-webp-content'], 'flower.webp', { type: 'image/webp' })

    expect(validateImageFile(validJpg).valid).toBe(true)
    expect(validateImageFile(validPng).valid).toBe(true)
    expect(validateImageFile(validWebp).valid).toBe(true)
  })

  it('rejects unsupported image file types', () => {
    const gifFile = new File(['fake-gif'], 'nature.gif', { type: 'image/gif' })
    const pdfFile = new File(['fake-pdf'], 'document.pdf', { type: 'application/pdf' })

    const resGif = validateImageFile(gifFile)
    expect(resGif.valid).toBe(false)
    expect(resGif.error).toContain('Unsupported image format')

    const resPdf = validateImageFile(pdfFile)
    expect(resPdf.valid).toBe(false)
  })

  it('rejects oversized images greater than 5MB', () => {
    // Mock a file larger than 5MB
    const bigFile = new File(['a'], 'giant.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: MAX_IMAGE_SIZE_BYTES + 1024 })

    const res = validateImageFile(bigFile)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('exceeds maximum allowed size of 5 MB')
  })
})
