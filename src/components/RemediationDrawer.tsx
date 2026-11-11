import React, { useState, useEffect } from 'react'
import { ShoppingBag, CheckCircle2, ShieldCheck, X, AlertCircle } from 'lucide-react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import type { RecommendedProduct, OrderQuote } from '../types'
import { fetchQuote, createBackendPayPalOrder, captureBackendPayPalOrder } from '../services/fastapiService'

interface RemediationDrawerProps {
  products: RecommendedProduct[]
  isOpen: boolean
  onClose: () => void
  onOrderSuccess: (orderId: number, captureId: string) => void
}

export const RemediationDrawer: React.FC<RemediationDrawerProps> = ({
  products,
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [quote, setQuote] = useState<OrderQuote | null>(null)
  const [_isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ orderId: number; captureId: string } | null>(null)

  // Initialize first product selected with qty 1
  useEffect(() => {
    if (products.length > 0 && Object.keys(selectedQuantities).length === 0) {
      setSelectedQuantities({ [products[0].sku]: 1 })
    }
  }, [products])

  // Recalculate server quote whenever quantities change
  useEffect(() => {
    const activeItems = Object.entries(selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([sku, quantity]) => ({ sku, quantity }))

    if (activeItems.length === 0) {
      setQuote(null)
      return
    }

    setIsLoadingQuote(true)
    setErrorMsg(null)
    fetchQuote(activeItems)
      .then((q) => setQuote(q))
      .catch((err) => setErrorMsg(err.message || 'Error updating quote'))
      .finally(() => setIsLoadingQuote(false))
  }, [selectedQuantities])

  const handleQtyChange = (sku: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[sku] || 0
      const updated = Math.max(0, current + delta)
      return { ...prev, [sku]: updated }
    })
  }

  if (!isOpen) return null

  return (
    <div className="cart-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
    }}>
      <div className="cart-modal-container" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        padding: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={24} style={{ color: '#047857' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Verified Remediation Supplies</h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>AI-Matched to Your Investigation Hypotheses</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {successInfo ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <CheckCircle2 size={54} style={{ color: '#16a34a', margin: '0 auto 1rem auto' }} />
            <h4 style={{ fontSize: '1.3rem', color: '#0f172a', margin: '0 0 0.5rem 0' }}>Payment Captured Successfully!</h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Your order has been verified server-side. Order ID: <strong>#{successInfo.orderId}</strong>
            </p>
            <div style={{ backgroundColor: '#f0fdf4', padding: '0.8rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#166534', margin: '1rem 0' }}>
              PayPal Capture ID: <code>{successInfo.captureId}</code>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => {
                onOrderSuccess(successInfo.orderId, successInfo.captureId)
                onClose()
              }}
            >
              View in Orders History
            </button>
          </div>
        ) : (
          <>
            {/* Products List */}
            <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {products.map((p) => {
                const qty = selectedQuantities[p.sku] || 0
                return (
                  <div
                    key={p.sku}
                    style={{
                      border: qty > 0 ? '2px solid #10b981' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.8rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: qty > 0 ? '#f0fdf4' : '#ffffff',
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '0.8rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>{p.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0' }}>{p.description}</div>
                      <div style={{ fontWeight: 700, color: '#047857', fontSize: '0.9rem' }}>
                        ${p.price.toFixed(2)} {p.currency}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleQtyChange(p.sku, -1)}
                        style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 600, minWidth: '18px', textAlign: 'center' }}>{qty}</span>
                      <button
                        onClick={() => handleQtyChange(p.sku, 1)}
                        style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Server Quote Summary */}
            {quote && (
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', margin: '1rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  <span>Subtotal:</span>
                  <span>${quote.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                  <span>Shipping (Standard Eco-Freight):</span>
                  <span>{quote.shipping === 0 ? 'FREE' : `$${quote.shipping.toFixed(2)}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  <span>Estimated Tax:</span>
                  <span>${quote.tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                  <span>Total Amount:</span>
                  <span>${quote.total.toFixed(2)} {quote.currency}</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PayPal Smart Payment Buttons */}
            {quote && quote.total > 0 && (
              <div style={{ marginTop: '1.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#047857', marginBottom: '0.5rem' }}>
                  <ShieldCheck size={16} />
                  <span>Server-Validated Pricing & Secure PayPal Capture</span>
                </div>

                <PayPalScriptProvider options={{ clientId: 'test', currency: quote.currency }}>
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                    createOrder={async () => {
                      const activeItems = Object.entries(selectedQuantities)
                        .filter(([_, qty]) => qty > 0)
                        .map(([sku, quantity]) => ({ sku, quantity }))

                      const result = await createBackendPayPalOrder(activeItems)
                      return result.paypal_order_id
                    }}
                    onApprove={async (data) => {
                      const activeItems = Object.entries(selectedQuantities)
                        .filter(([_, qty]) => qty > 0)
                        .map(([sku, quantity]) => ({ sku, quantity }))

                      // Create server order record first
                      const createRes = await createBackendPayPalOrder(activeItems)
                      // Capture server-to-server
                      const capRes = await captureBackendPayPalOrder(createRes.order_id, data.orderID)
                      setSuccessInfo({ orderId: capRes.order_id, captureId: capRes.paypal_capture_id })
                    }}
                    onError={(_err) => {
                      setErrorMsg('PayPal checkout was cancelled or encountered an error.')
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
