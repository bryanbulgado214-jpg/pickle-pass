import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { C } from '../lib/constants';

const XENDIT_METHODS = [
  { id: 'gcash', label: 'GCash', note: 'Instant', icon: '🟢' },
  { id: 'maya', label: 'Maya', note: 'Instant', icon: '🟣' },
];

export default function PaySheet({ fee, serviceFee, label, sessionId, tournamentId, bookingId, onClose, onConfirm }) {
  const [method, setMethod] = useState('gcash');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const total = fee + serviceFee;

  async function handlePay() {
    setProcessing(true);
    setError(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error('Not logged in');

      const res = await supabase.functions.invoke('create-payment', {
        body: {
          session_id: sessionId || null,
          tournament_id: tournamentId || null,
          booking_id: bookingId || null,
          amount: fee,
          service_fee: serviceFee,
          description: label,
          payment_method: method,
        },
      });

      if (res.error) throw new Error(res.error.message || 'Payment failed');

      const { invoice_url } = res.data;
      if (invoice_url) {
        window.location.href = invoice_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  }

  return (
    <div className="sheetScrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <h3 className="h1" style={{ fontSize: 20 }}>Confirm Payment</h3>
        <p className="cardSub" style={{ marginTop: 4 }}>{label}</p>

        <div className="payRows">
          <div className="payRow">
            <span>Session fee</span>
            <span>{"₱"}{Number(fee).toLocaleString()}</span>
          </div>
          <div className="payRow dim">
            <span>Service fee (5%)</span>
            <span>{"₱"}{serviceFee.toFixed(2)}</span>
          </div>
          <div className="payRow total">
            <span>Total</span>
            <span>{"₱"}{total.toFixed(2)}</span>
          </div>
        </div>

        <h4 className="h2">PAYMENT METHOD</h4>
        {XENDIT_METHODS.map((m) => (
          <button
            key={m.id}
            className={"payMethod" + (method === m.id ? " on" : "")}
            onClick={() => setMethod(m.id)}
            disabled={processing}
          >
            <span className="pmIcon">{m.icon}</span>
            <div className="pmDot" />
            <span className="pmLabel">{m.label}</span>
            <span className="pmNote">{m.note}</span>
          </button>
        ))}

        {error && <div className="errorBanner" style={{ margin: '10px 0 0' }}>{error}</div>}

        <button className="cta" onClick={handlePay} disabled={processing}>
          {processing
            ? 'Connecting to payment...'
            : `Pay ₱${total.toFixed(2)} via ${XENDIT_METHODS.find((m) => m.id === method)?.label}`}
        </button>
        <div className="xenditBadge">
          <span className="xenditLock">{"🔒"}</span> Secured by <strong>Xendit</strong>
        </div>
        <div className="fine">
          You{"'"}ll be redirected to {XENDIT_METHODS.find((m) => m.id === method)?.label} to complete payment. Full refund if you cancel before the session starts.
        </div>
      </div>
    </div>
  );
}
