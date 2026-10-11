export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Please choose JPEG, PNG, or WebP.`,
    }
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `Image exceeds maximum allowed size of 5 MB (selected image: ${sizeMb} MB).`,
    }
  }

  return { valid: true }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as base64 string.'))
      }
    }
    reader.onerror = () => reject(reader.error || new Error('Error reading image file.'))
    reader.readAsDataURL(file)
  })
}
