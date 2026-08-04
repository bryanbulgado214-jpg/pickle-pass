import { useState } from 'react';
import { C } from '../lib/constants';

const XENDIT_METHODS = [
  { id: 'gcash', label: 'GCash', note: 'Instant', icon: '🟢' },
  { id: 'maya', label: 'Maya', note: 'Instant', icon: '🟣' },
];

export default function PaySheet({ fee, serviceFee, label, onClose, onConfirm }) {
  const [method, setMethod] = useState('gcash');
  const total = fee + serviceFee;

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
          >
            <span className="pmIcon">{m.icon}</span>
            <div className="pmDot" />
            <span className="pmLabel">{m.label}</span>
            <span className="pmNote">{m.note}</span>
          </button>
        ))}

        <button className="cta" onClick={onConfirm}>
          Pay {"₱"}{total.toFixed(2)} via {XENDIT_METHODS.find((m) => m.id === method)?.label}
        </button>
        <div className="xenditBadge">
          <span className="xenditLock">{"🔒"}</span> Secured by <strong>Xendit</strong>
        </div>
        <div className="fine">
          Full refund if you cancel before the session starts.
        </div>
      </div>
    </div>
  );
}
