import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { LoadingBall } from './ui';

export default function PaymentHistory({ onBack }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    const { data: participants } = await supabase
      .from('session_participants')
      .select('*, session:session_id(id, label, fee, type, schedule_text, court:court_id(name, town))')
      .eq('profile_id', user.id)
      .eq('status', 'confirmed')
      .order('joined_at', { ascending: false });

    const { data: bookings } = await supabase
      .from('court_bookings')
      .select('*, court:court_id(name, town)')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    const { data: tourneyRegs } = await supabase
      .from('tournament_registrations')
      .select('*, tournament:tournament_id(name, fee, court:court_id(name))')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    // Also fetch from payments table (real Xendit payments)
    const { data: xenditPayments } = await supabase
      .from('payments')
      .select('*, session:session_id(label, court:court_id(name)), tournament:tournament_id(name, court:court_id(name))')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    const items = [];
    const xenditSessionIds = new Set();
    const xenditTourneyIds = new Set();

    // Real Xendit payments take priority
    (xenditPayments || []).forEach((p) => {
      if (p.session_id) xenditSessionIds.add(p.session_id);
      if (p.tournament_id) xenditTourneyIds.add(p.tournament_id);
      items.push({
        id: `pay-${p.id}`,
        type: p.tournament_id ? 'Tournament' : p.booking_id ? 'Booking' : 'Session',
        label: p.session?.label || p.tournament?.name || 'Payment',
        court: p.session?.court?.name || p.tournament?.court?.name || null,
        fee: Number(p.amount),
        serviceFee: Number(p.service_fee),
        total: Number(p.total),
        date: p.paid_at || p.created_at,
        method: (p.payment_method || 'gcash').toUpperCase(),
        status: p.status,
      });
    });

    // Legacy session-based records (skip if already covered by payments table)
    (participants || []).forEach((p) => {
      if (!p.session || xenditSessionIds.has(p.session_id)) return;
      const fee = Number(p.session.fee);
      const serviceFee = Math.round(fee * 0.05 * 100) / 100;
      items.push({
        id: `session-${p.id}`,
        type: 'Session',
        label: p.session.label,
        court: p.session.court?.name,
        fee,
        serviceFee,
        total: fee + serviceFee,
        date: p.joined_at || p.created_at,
        method: 'GCash / Maya',
        status: 'paid',
      });
    });

    (bookings || []).forEach((b) => {
      items.push({
        id: `booking-${b.id}`,
        type: 'Booking',
        label: `Court Rental — ${b.time_slot}`,
        court: b.court?.name,
        fee: 0,
        serviceFee: 0,
        total: 0,
        date: b.created_at,
        method: 'GCash / Maya',
        status: 'paid',
      });
    });

    (tourneyRegs || []).forEach((r) => {
      if (!r.tournament || xenditTourneyIds.has(r.tournament_id)) return;
      const fee = Number(r.tournament.fee || 0);
      const serviceFee = Math.round(fee * 0.05 * 100) / 100;
      items.push({
        id: `tourney-${r.id}`,
        type: 'Tournament',
        label: r.tournament.name,
        court: r.tournament.court?.name,
        fee,
        serviceFee,
        total: fee + serviceFee,
        date: r.created_at,
        method: 'GCash / Maya',
        status: 'paid',
      });
    });

    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    setPayments(items);
    setLoading(false);
  }

  const totalSpent = payments.reduce((s, p) => s + p.total, 0);

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"← Back"}</button>
      <div className="paneHead">
        <div className="h1">PAYMENT HISTORY</div>
        <div className="sub">Your transactions on Pickle Pass</div>
      </div>

      <div className="statGrid">
        <div className="stat">
          <div className="statK">TOTAL SPENT</div>
          <div className="statV" style={{ color: C.ball }}>{"₱"}{totalSpent.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="statK">TRANSACTIONS</div>
          <div className="statV">{payments.length}</div>
        </div>
      </div>

      {loading && <LoadingBall />}

      {!loading && payments.length === 0 && (
        <div className="empty">
          <div className="cardTitle">No payments yet</div>
          <div className="sub" style={{ marginTop: 6 }}>Join a session to see your payment history here.</div>
        </div>
      )}

      {payments.map((p) => (
        <div key={p.id} className="receiptCard">
          <div className="receiptTop">
            <div>
              <div className="receiptType">{p.type}</div>
              <div className="cardTitle" style={{ fontSize: 14 }}>{p.label}</div>
              {p.court && <div className="cardMeta">{p.court}</div>}
            </div>
            <div className="receiptAmt">{"₱"}{p.total.toLocaleString()}</div>
          </div>
          <div className="receiptBottom">
            <span>{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span>
              {p.method}
              {p.status && p.status !== 'paid' && (
                <span className={`payStatus ${p.status}`}> · {p.status}</span>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OwnerPayoutLedger() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayouts();
  }, []);

  async function loadPayouts() {
    setLoading(true);
    const { data: courts } = await supabase
      .from('courts')
      .select('id')
      .eq('owner_id', user.id);

    if (!courts?.length) { setLoading(false); return; }
    const courtIds = courts.map((c) => c.id);

    const { data: sessData } = await supabase
      .from('sessions')
      .select('*, court:court_id(name)')
      .in('court_id', courtIds)
      .order('created_at', { ascending: false });

    const sessList = sessData || [];
    const sessIds = sessList.map((s) => s.id);

    let partCounts = {};
    if (sessIds.length) {
      const { data: parts } = await supabase
        .from('session_participants')
        .select('session_id')
        .in('session_id', sessIds)
        .eq('status', 'confirmed');
      (parts || []).forEach((p) => {
        partCounts[p.session_id] = (partCounts[p.session_id] || 0) + 1;
      });
    }

    setSessions(sessList.map((s) => ({
      ...s,
      playerCount: partCounts[s.id] || 0,
      revenue: (partCounts[s.id] || 0) * Number(s.fee),
    })));
    setLoading(false);
  }

  const totalRevenue = sessions.reduce((s, sess) => s + sess.revenue, 0);
  const totalPlayers = sessions.reduce((s, sess) => s + sess.playerCount, 0);

  return (
    <div className="pane">
      <div className="paneHead">
        <div className="h1">PAYOUTS</div>
        <div className="sub">Lump sum, next day after each session</div>
      </div>

      <div className="statGrid">
        <div className="stat">
          <div className="statK">TOTAL REVENUE</div>
          <div className="statV" style={{ color: C.ball }}>{"₱"}{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="statK">TOTAL PLAYERS</div>
          <div className="statV">{totalPlayers}</div>
        </div>
      </div>

      {loading && <LoadingBall />}

      {!loading && sessions.length === 0 && (
        <div className="empty">
          <div className="cardTitle">No payouts yet</div>
          <div className="sub" style={{ marginTop: 6 }}>Earnings from completed sessions will appear here.</div>
        </div>
      )}

      {sessions.map((s) => (
        <div key={s.id} className="receiptCard">
          <div className="receiptTop">
            <div>
              <div className="receiptType">{s.type === 'OPEN_PLAY' ? 'Open Play' : s.type === 'TRAINING' ? 'Training' : 'Rental'}</div>
              <div className="cardTitle" style={{ fontSize: 14 }}>{s.label}</div>
              <div className="cardMeta">{s.court?.name} {"·"} {s.playerCount} players</div>
            </div>
            <div className="receiptAmt" style={{ color: C.ok }}>{"₱"}{s.revenue.toLocaleString()}</div>
          </div>
          <div className="receiptBottom">
            <span>{s.schedule_text || 'Scheduled'}</span>
            <span>{"₱"}{s.fee}/player</span>
          </div>
        </div>
      ))}

      <div className="fine" style={{ marginTop: 16 }}>Players pay the entrance fee + a small app service fee. You always receive 100% of your posted rate.</div>
    </div>
  );
}
