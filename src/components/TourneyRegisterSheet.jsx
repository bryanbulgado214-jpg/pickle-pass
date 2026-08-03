export default function TourneyRegisterSheet({ tournament, onClose, onConfirm }) {
  const svc = Math.round(tournament.fee * 0.05);
  return (
    <div className="sheetScrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <h3 className="h1" style={{ fontSize: 20 }}>Confirm Registration</h3>
        <p className="sub" style={{ marginTop: 4 }}>{tournament.name}</p>
        <div className="payRows">
          <div className="payRow"><span>Entry fee</span><span>{"₱"}{tournament.fee}.00</span></div>
          <div className="payRow dim"><span>App service fee (5%)</span><span>{"₱"}{svc}.00</span></div>
          <div className="payRow total"><span>Total</span><span>{"₱"}{tournament.fee + svc}.00</span></div>
        </div>
        <button className="cta" onClick={onConfirm}>Pay {"₱"}{tournament.fee + svc} & register</button>
        <div className="fine">Bracket details follow closer to the date.</div>
      </div>
    </div>
  );
}
