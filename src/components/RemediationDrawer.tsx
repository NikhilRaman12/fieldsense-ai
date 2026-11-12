import React, { useState, useEffect, useRef } from 'react'
import { CheckCircle2, ShieldCheck, X, AlertCircle, Loader2, Sparkles, CreditCard, Lock } from 'lucide-react'
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
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ orderId: number; captureId: string } | null>(null)

  // Track pending order using refs for instant synchronous availability in callbacks
  const pendingOrderIdRef = useRef<number | null>(null)
  const pendingPayPalOrderIdRef = useRef<string | null>(null)

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
      pendingOrderIdRef.current = null
      pendingPayPalOrderIdRef.current = null
      return
    }

    setIsLoadingQuote(true)
    setErrorMsg(null)
    pendingOrderIdRef.current = null
    pendingPayPalOrderIdRef.current = null

    fetchQuote(activeItems)
      .then((q) => setQuote(q))
      .catch((err) => setErrorMsg(err.message || 'Error updating quote'))
      .finally(() => setIsLoadingQuote(false))
  }, [selectedQuantities])

  const handleQtyChange = (sku: string, delta: number) => {
    if (isProcessingPayment) return
    setSelectedQuantities((prev) => {
      const current = prev[sku] || 0
      const updated = Math.max(0, current + delta)
      return { ...prev, [sku]: updated }
    })
  }

  if (!isOpen) return null

  const rawClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID
  const isPayPalConfigured = Boolean(rawClientId && rawClientId !== 'test' && rawClientId.trim() !== '')
  const paypalClientId = isPayPalConfigured ? rawClientId.trim() : ''

  return (
    <div className="cart-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 7, 10, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.25rem',
      animation: 'fadeIn 0.25s ease',
    }}>
      <div className="cart-modal-container" style={{
        backgroundColor: '#0f1217',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        maxWidth: '580px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 112, 186, 0.15)',
        padding: '1.75rem',
        color: '#ffffff',
      }}>
        {/* CRED/Fintech Enterprise Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 112, 186, 0.4)',
            }}>
              <CreditCard size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  PayPal Commerce
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: 'rgba(0, 112, 186, 0.18)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}>
                  v2 Secure
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Server-Authoritative Procurement & Diagnostic Supplies
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessingPayment}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
              color: '#94a3b8',
              transition: 'all 0.2s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {successInfo ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
            }}>
              <CheckCircle2 size={42} style={{ color: '#10b981' }} />
            </div>
            <h4 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.4rem 0' }}>
              Payment Captured Successfully!
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
              Your order has been verified and settled server-side via PayPal. Order reference: <strong style={{ color: '#ffffff' }}>#{successInfo.orderId}</strong>
            </p>
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.85rem',
              color: '#a7f3d0',
              marginBottom: '1.5rem',
              fontFamily: 'monospace',
            }}>
              PayPal Capture ID: <strong>{successInfo.captureId}</strong>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem' }}
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
            {/* Products List - High Polish Fintech Cards */}
            <div style={{ margin: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {products.map((p) => {
                const qty = selectedQuantities[p.sku] || 0
                return (
                  <div
                    key={p.sku}
                    style={{
                      border: qty > 0 ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '1rem 1.15rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: qty > 0 ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      boxShadow: qty > 0 ? '0 0 20px rgba(16, 185, 129, 0.08)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#ffffff' }}>{p.title}</div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.25rem 0 0.4rem 0', lineHeight: '1.4' }}>{p.description}</div>
                      <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '0.95rem' }}>
                        ${p.price.toFixed(2)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.currency}</span>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      padding: '0.25rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}>
                      <button
                        onClick={() => handleQtyChange(p.sku, -1)}
                        disabled={isProcessingPayment}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 700, minWidth: '22px', textAlign: 'center', color: '#ffffff' }}>{qty}</span>
                      <button
                        onClick={() => handleQtyChange(p.sku, 1)}
                        disabled={isProcessingPayment}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Server Quote Recalculation Badge */}
            {isLoadingQuote && (
              <div style={{ textAlign: 'center', padding: '0.6rem', color: '#38bdf8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} className="spin" />
                <span>Computing server-authoritative quotation...</span>
              </div>
            )}

            {/* CRED-Style Glowing Bill Summary */}
            {quote && (
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                margin: '1.25rem 0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  <span>Catalogue Subtotal:</span>
                  <span style={{ color: '#ffffff' }}>${quote.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  <span>Eco-Freight Delivery:</span>
                  <span style={{ color: quote.shipping === 0 ? '#10b981' : '#ffffff', fontWeight: 600 }}>
                    {quote.shipping === 0 ? 'FREE' : `$${quote.shipping.toFixed(2)}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#94a3b8', marginBottom: '0.65rem' }}>
                  <span>Estimated Tax (6.5%):</span>
                  <span style={{ color: '#ffffff' }}>${quote.tax.toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="#ffc439" />
                    <span>Total Amount:</span>
                  </div>
                  <span style={{ color: '#ffc439', fontFamily: 'monospace' }}>
                    ${quote.total.toFixed(2)} {quote.currency}
                  </span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#f87171',
                fontSize: '0.86rem',
                margin: '0.75rem 0',
                padding: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '10px',
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {isProcessingPayment && (
              <div style={{
                textAlign: 'center',
                padding: '1.25rem',
                backgroundColor: 'rgba(0, 112, 186, 0.12)',
                borderRadius: '14px',
                border: '1px solid rgba(0, 112, 186, 0.35)',
                color: '#38bdf8',
                margin: '0.75rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
              }}>
                <Loader2 size={20} className="spin" />
                <span style={{ fontWeight: 700 }}>Settling transaction with PayPal API v2...</span>
              </div>
            )}

            {/* PayPal Smart Payment Buttons & Gateway Guard */}
            {quote && quote.total > 0 && !isProcessingPayment && (
              <div style={{ marginTop: '1.25rem' }}>
                {!isPayPalConfigured ? (
                  <div style={{
                    padding: '1.15rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '14px',
                    color: '#fbbf24',
                    fontSize: '0.86rem',
                    lineHeight: '1.5',
                  }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                      <Lock size={16} />
                      PayPal Sandbox Credentials Required
                    </div>
                    <div>
                      Checkout is disabled because <code>VITE_PAYPAL_CLIENT_ID</code> is not configured.
                      To enable live Sandbox payments, add your PayPal Sandbox Client ID to <code>.env</code> and restart the application.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#10b981', marginBottom: '0.75rem', fontWeight: 600 }}>
                      <ShieldCheck size={16} />
                      <span>Encrypted Server-Authoritative PayPal v2 Settlement</span>
                    </div>

                    <PayPalScriptProvider options={{ clientId: paypalClientId, currency: quote.currency }}>
                      <PayPalButtons
                        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                        createOrder={async () => {
                          if (isProcessingPayment) {
                            throw new Error('Payment processing already in progress.')
                          }
                          const activeItems = Object.entries(selectedQuantities)
                            .filter(([_, qty]) => qty > 0)
                            .map(([sku, quantity]) => ({ sku, quantity }))

                          // Create exactly ONE local order and one PayPal order
                          const result = await createBackendPayPalOrder(activeItems)
                          pendingOrderIdRef.current = result.order_id
                          pendingPayPalOrderIdRef.current = result.paypal_order_id
                          return result.paypal_order_id
                        }}
                        onApprove={async (data) => {
                          setIsProcessingPayment(true)
                          setErrorMsg(null)
                          try {
                            const targetOrderId = pendingOrderIdRef.current
                            const targetPayPalOrderId = data.orderID || pendingPayPalOrderIdRef.current

                            if (!targetOrderId || !targetPayPalOrderId) {
                              throw new Error('Order identification lost during checkout. Please try again.')
                            }

                            // Capture the EXACT order created during createOrder - never re-create
                            const capRes = await captureBackendPayPalOrder(targetOrderId, targetPayPalOrderId)
                            setSuccessInfo({ orderId: capRes.order_id, captureId: capRes.paypal_capture_id })
                          } catch (err: any) {
                            setErrorMsg(err.message || 'Payment capture failed.')
                          } finally {
                            setIsProcessingPayment(false)
                          }
                        }}
                        onCancel={() => {
                          setIsProcessingPayment(false)
                          setErrorMsg('PayPal checkout was cancelled by the buyer.')
                        }}
                        onError={(_err) => {
                          setIsProcessingPayment(false)
                          setErrorMsg('PayPal checkout encountered an error. Please verify gateway settings.')
                        }}
                      />
                    </PayPalScriptProvider>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
