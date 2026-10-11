import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Mock URL.createObjectURL and revokeObjectURL for jsdom
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url'
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {}
  }
}
