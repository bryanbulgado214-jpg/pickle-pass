import { C } from '../lib/constants';

export default function CancelSheet({ fee, label, onClose, onConfirm }) {
  const svc = Math.round(Number(fee) * 0.05 * 100) / 100;
  const total = Number(fee) + svc;
  return (
    <div className="sheetScrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <h3 className="h1" style={{ fontSize: 20 }}>Cancel Your Spot?</h3>
        <p className="sub" style={{ marginTop: 4 }}>{label}</p>
        <div className="payRows">
          <div className="payRow"><span>Refund</span><span className="okText">{"₱"}{total.toFixed(2)} in full</span></div>
          <div className="payRow dim"><span>Points earned for joining</span><span>-10 pts</span></div>
        </div>
        <button className="cta cancelCta" onClick={onConfirm}>Yes, cancel my spot</button>
        <button className="ghostBtn" style={{ marginTop: 8 }} onClick={onClose}>Never mind</button>
        <div className="fine">Cancellations more than 3 hrs before start get a full refund.</div>
      </div>
    </div>
  );
}
