import { useState } from 'react';

const XENDIT_METHODS = [
  { id: 'gcash', label: 'GCash', note: 'Instant', icon: '🟢' },
  { id: 'maya', label: 'Maya', note: 'Instant', icon: '🟣' },
];

export default function TourneyRegisterSheet({ tournament, onClose, onConfirm }) {
  const [method, setMethod] = useState('gcash');
  const svc = Math.round(tournament.fee * 0.05);
  const total = tournament.fee + svc;

  return (
    <div className="sheetScrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <h3 className="h1" style={{ fontSize: 20 }}>Confirm Registration</h3>
        <p className="sub" style={{ marginTop: 4 }}>{tournament.name}</p>
        <div className="payRows">
          <div className="payRow"><span>Entry fee</span><span>{"₱"}{tournament.fee}.00</span></div>
          <div className="payRow dim"><span>App service fee (5%)</span><span>{"₱"}{svc}.00</span></div>
          <div className="payRow total"><span>Total</span><span>{"₱"}{total}.00</span></div>
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
          Pay {"₱"}{total} & register via {XENDIT_METHODS.find((m) => m.id === method)?.label}
        </button>
        <div className="xenditBadge">
          <span className="xenditLock">{"🔒"}</span> Secured by <strong>Xendit</strong>
        </div>
        <div className="fine">Bracket details follow closer to the date.</div>
      </div>
    </div>
  );
}
