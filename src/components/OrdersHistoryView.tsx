import React, { useEffect, useState } from 'react'
import { ShoppingBag, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import type { OrderRecord } from '../types'
import { fetchOrdersHistory } from '../services/fastapiService'

export const OrdersHistoryView: React.FC = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchOrdersHistory()
      setOrders(data)
    } catch (err: any) {
      setError(err.message || 'Failed to connect to orders backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  return (
    <div className="orders-container" style={{ maxWidth: '850px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-forest-dark)', margin: 0 }}>
            Field Supplies Order History
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
            Verified PayPal transactions and digital receipts for diagnostic testing supplies.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={loadOrders}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
          <strong>Backend Service Notice:</strong> {error}
        </div>
      )}

      {orders.length === 0 && !loading && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <ShoppingBag size={48} style={{ color: 'var(--color-sage)', margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: 'var(--color-forest-dark)', margin: '0 0 0.5rem 0' }}>No Orders Found</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
            When an AI field investigation recommends physical diagnostic kits or soil amendments, you can order them in 1 click via PayPal.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.map((ord) => (
          <div
            key={ord.id}
            className="card"
            style={{
              padding: '1.25rem',
              borderLeft: ord.status === 'COMPLETED' ? '4px solid #16a34a' : '4px solid #f59e0b',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-forest-dark)' }}>
                  Order #{ord.id} ({ord.client_order_ref})
                </span>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Placed on {new Date(ord.created_at).toLocaleString()}
                </div>
              </div>

              <div>
                {ord.status === 'COMPLETED' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.8rem', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Captured & Confirmed
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Clock size={14} /> {ord.status}
                  </span>
                )}
              </div>
            </div>

            {/* Item Breakdown */}
            <div style={{ margin: '0.5rem 0' }}>
              {ord.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', margin: '0.3rem 0', color: '#334155' }}>
                  <span>
                    <strong>{it.quantity}x</strong> {it.title} (<code>{it.sku}</code>)
                  </span>
                  <span>${it.total_price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                {ord.paypal_capture_id && (
                  <span>PayPal Capture: <code>{ord.paypal_capture_id}</code></span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-forest-dark)' }}>
                Total: ${ord.total_amount.toFixed(2)} {ord.currency}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
