import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { RemediationDrawer } from '../components/RemediationDrawer'
import * as fastapiService from '../services/fastapiService'
import type { RecommendedProduct, OrderQuote } from '../types'

// Mock the PayPal React SDK to test our callbacks in isolation
vi.mock('@paypal/react-paypal-js', () => ({
  PayPalScriptProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PayPalButtons: ({ createOrder, onApprove, onCancel, onError }: any) => (
    <div data-testid="paypal-buttons-mock">
      <button
        data-testid="mock-paypal-approve-btn"
        onClick={async () => {
          try {
            const paypalOrderId = await createOrder()
            await onApprove({ orderID: paypalOrderId })
          } catch (err: any) {
            onError(err)
          }
        }}
      >
        Mock Pay
      </button>
      <button
        data-testid="mock-paypal-cancel-btn"
        onClick={() => onCancel()}
      >
        Mock Cancel
      </button>
      <button
        data-testid="mock-paypal-error-btn"
        onClick={() => onError(new Error('Simulated gateway failure'))}
      >
        Mock Error
      </button>
    </div>
  ),
}))

describe('RemediationDrawer PayPal Checkout Flow', () => {
  const sampleProducts: RecommendedProduct[] = [
    {
      sku: 'KIT-SOIL-PH-01',
      title: 'Precision Soil Ribbon & pH Field Test Kit',
      description: 'Rapid chemical reagent test',
      category: 'diagnostic',
      price: 18.99,
      currency: 'USD',
    },
  ]

  const mockQuote: OrderQuote = {
    items: [
      {
        sku: 'KIT-SOIL-PH-01',
        title: 'Precision Soil Ribbon & pH Field Test Kit',
        unit_price: 18.99,
        quantity: 1,
        total_price: 18.99,
        currency: 'USD',
      },
    ],
    subtotal: 18.99,
    shipping: 4.99,
    tax: 1.23,
    total: 25.21,
    currency: 'USD',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(fastapiService, 'fetchQuote').mockResolvedValue(mockQuote)
  })

  it('calls createBackendPayPalOrder exactly once and captures the exact same order', async () => {
    const createOrderSpy = vi.spyOn(fastapiService, 'createBackendPayPalOrder').mockResolvedValue({
      order_id: 42,
      client_order_ref: 'fs-ord-test123',
      paypal_order_id: 'PAYPAL-ORDER-42',
      total: 25.21,
      currency: 'USD',
    })

    const captureOrderSpy = vi.spyOn(fastapiService, 'captureBackendPayPalOrder').mockResolvedValue({
      order_id: 42,
      status: 'COMPLETED',
      paypal_capture_id: 'GENUINE-CAP-42',
      total_amount: 25.21,
      currency: 'USD',
    })

    const onOrderSuccessMock = vi.fn()
    const onCloseMock = vi.fn()

    render(
      <RemediationDrawer
        products={sampleProducts}
        isOpen={true}
        onClose={onCloseMock}
        onOrderSuccess={onOrderSuccessMock}
      />
    )

    // Wait for server quotation to render
    await waitFor(() => {
      expect(screen.getByText('Total Amount:')).toBeInTheDocument()
    })

    const payBtn = screen.getByTestId('mock-paypal-approve-btn')
    await userEvent.click(payBtn)

    // Verify createBackendPayPalOrder called EXACTLY ONCE
    expect(createOrderSpy).toHaveBeenCalledTimes(1)
    expect(createOrderSpy).toHaveBeenCalledWith([{ sku: 'KIT-SOIL-PH-01', quantity: 1 }])

    // Verify capture called with the SAME local order_id (42) and paypal_order_id ('PAYPAL-ORDER-42')
    expect(captureOrderSpy).toHaveBeenCalledTimes(1)
    expect(captureOrderSpy).toHaveBeenCalledWith(42, 'PAYPAL-ORDER-42')

    // Verify success confirmation displays genuine capture ID and does not show false success
    await waitFor(() => {
      expect(screen.getByText('Payment Captured Successfully!')).toBeInTheDocument()
      expect(screen.getByText('GENUINE-CAP-42')).toBeInTheDocument()
    })
  })

  it('handles PayPal checkout cancellation without falsely showing payment success', async () => {
    render(
      <RemediationDrawer
        products={sampleProducts}
        isOpen={true}
        onClose={vi.fn()}
        onOrderSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-paypal-cancel-btn')).toBeInTheDocument()
    })

    const cancelBtn = screen.getByTestId('mock-paypal-cancel-btn')
    await userEvent.click(cancelBtn)

    // Must show cancellation error and NEVER show payment success
    expect(screen.getByText('PayPal checkout was cancelled by the buyer.')).toBeInTheDocument()
    expect(screen.queryByText('Payment Captured Successfully!')).not.toBeInTheDocument()
  })

  it('handles capture failure gracefully without showing success', async () => {
    vi.spyOn(fastapiService, 'createBackendPayPalOrder').mockResolvedValue({
      order_id: 77,
      client_order_ref: 'fs-ord-77',
      paypal_order_id: 'PAYPAL-77',
      total: 25.21,
      currency: 'USD',
    })

    vi.spyOn(fastapiService, 'captureBackendPayPalOrder').mockRejectedValue(
      new Error('Bank authorization declined')
    )

    render(
      <RemediationDrawer
        products={sampleProducts}
        isOpen={true}
        onClose={vi.fn()}
        onOrderSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-paypal-approve-btn')).toBeInTheDocument()
    })

    const payBtn = screen.getByTestId('mock-paypal-approve-btn')
    await userEvent.click(payBtn)

    await waitFor(() => {
      expect(screen.getByText('Bank authorization declined')).toBeInTheDocument()
      expect(screen.queryByText('Payment Captured Successfully!')).not.toBeInTheDocument()
    })
  })
})
