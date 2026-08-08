import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GCASH_NUMBER = '09456614065';

export default function TourneyRegisterSheet({ tournament, onClose, onConfirm }) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const svc = Math.round(tournament.fee * 0.05);
  const total = tournament.fee + svc;

  function copyNumber() {
    navigator.clipboard.writeText(GCASH_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  async function handleConfirmSent() {
    setProcessing(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase.from('payments').insert({
        profile_id: user.id,
        tournament_id: tournament.id,
        amount: tournament.fee,
        service_fee: svc,
        total,
        currency: 'PHP',
        payment_method: 'gcash',
        status: 'pending',
      });

      if (insertErr) throw insertErr;
      onConfirm?.();
    } catch (err) {
      console.error('Payment record error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  }

  return (
    <div className="sheetScrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <h3 className="h1" style={{ fontSize: 20 }}>Register via GCash</h3>
        <p className="sub" style={{ marginTop: 4 }}>{tournament.name}</p>

        <div className="payRows">
          <div className="payRow"><span>Entry fee</span><span>{"₱"}{tournament.fee}.00</span></div>
          <div className="payRow dim"><span>App service fee (5%)</span><span>{"₱"}{svc}.00</span></div>
          <div className="payRow total"><span>Total</span><span>{"₱"}{total}.00</span></div>
        </div>

        <div className="gcashBox">
          <div className="gcashLabel">Send exactly {"₱"}{total}.00 to</div>
          <button className="gcashNumber" onClick={copyNumber}>
            {GCASH_NUMBER}
            <span className="gcashCopy">{copied ? 'Copied!' : 'Tap to copy'}</span>
          </button>
          <div className="gcashSteps">
            <div className="gcashStep">1. Open your GCash app</div>
            <div className="gcashStep">2. Tap Send Money</div>
            <div className="gcashStep">3. Enter the number above and amount</div>
            <div className="gcashStep">4. Complete the transfer, then tap below</div>
          </div>
        </div>

        {error && <div className="errorBanner" style={{ margin: '10px 0 0' }}>{error}</div>}

        <button className="cta" onClick={handleConfirmSent} disabled={processing}>
          {processing ? 'Confirming...' : "I've Sent the Payment"}
        </button>
        <div className="fine">
          Your registration is confirmed once you tap above. Bracket details follow closer to the date.
        </div>
      </div>
    </div>
  );
}
