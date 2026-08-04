import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Ball, Tag } from './ui';
import QRCode from 'qrcode';

function QRCanvas({ value, size = 70 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#0A2E3C', light: '#F2F6F1' },
    }).catch(() => {});
  }, [value, size]);
  return <canvas ref={canvasRef} className="qrCanvas" />;
}

function QRExpanded({ value, label, onClose }) {
  return (
    <div className="qrExpandedScrim" onClick={onClose}>
      <div className="qrExpandedCard" onClick={(e) => e.stopPropagation()}>
        <div className="h2" style={{ margin: '0 0 4px', textAlign: 'center' }}>CHECK-IN QR</div>
        <div className="cardTitle" style={{ textAlign: 'center', marginBottom: 12 }}>{label}</div>
        <QRCanvas value={value} size={200} />
        <div className="sub" style={{ textAlign: 'center', marginTop: 10 }}>Show this to the court owner to check in</div>
        <button className="cta" onClick={onClose} style={{ marginTop: 14 }}>Done</button>
      </div>
    </div>
  );
}

export default function MyGamesScreen() {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState([]);
  const [waitlisted, setWaitlisted] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQR, setExpandedQR] = useState(null);

  useEffect(() => {
    loadMyGames();
  }, []);

  async function loadMyGames() {
    setLoading(true);
    setError(null);

    const { data: participants, error: err } = await supabase
      .from('session_participants')
      .select('*, session:session_id(id, label, schedule_text, fee, court:court_id(id, name, town))')
      .eq('profile_id', user.id)
      .in('status', ['confirmed', 'waitlisted']);

    if (err) { setError(err.message); setLoading(false); return; }

    const conf = [];
    const wait = [];
    (participants || []).forEach((p) => {
      if (!p.session) return;
      const entry = { participantId: p.id, session: p.session, court: p.session.court };
      if (p.status === 'confirmed') conf.push(entry);
      else wait.push(entry);
    });
    setConfirmed(conf);
    setWaitlisted(wait);

    const { data: regs } = await supabase
      .from('tournament_registrations')
      .select('*, tournament:tournament_id(id, name, event_date, court:court_id(id, name))')
      .eq('profile_id', user.id);
    setTournaments((regs || []).filter((r) => r.tournament).map((r) => ({
      regId: r.id,
      ...r.tournament,
      courtName: r.tournament.court?.name,
    })));

    setLoading(false);
  }

  async function cancelSpot(participantId) {
    await supabase.from('session_participants').delete().eq('id', participantId);
    loadMyGames();
  }

  async function leaveWaitlist(participantId) {
    await supabase.from('session_participants').delete().eq('id', participantId);
    loadMyGames();
  }

  if (loading) {
    return (
      <div className="pane">
        <div className="paneHead">
          <div className="h1">MY GAMES</div>
          <div className="sub">Your upcoming sessions</div>
        </div>
        <p style={{ color: C.sand, fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  const empty = confirmed.length === 0 && tournaments.length === 0 && waitlisted.length === 0;

  return (
    <div className="pane">
      <div className="paneHead">
        <div className="h1">MY GAMES</div>
        <div className="sub">Your upcoming sessions</div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {empty && (
        <div className="empty">
          <Ball size={34} />
          <div className="cardTitle" style={{ marginTop: 10 }}>No games yet</div>
          <div className="sub">Join an open play from the Play tab and it shows up here with your QR gate pass.</div>
        </div>
      )}

      {confirmed.map((g) => {
        const qrValue = `pp:checkin:${g.session.id}:${g.participantId}`;
        return (
          <div key={g.participantId} className="ticket">
            <div className="ticketTop">
              <div>
                <div className="cardTitle">{g.session.label || 'Session'}</div>
                <div className="cardMeta">{g.court?.name} {g.session.schedule_text ? `· ${g.session.schedule_text}` : ''}</div>
                <button className="linkBtn small" onClick={() => setExpandedQR({ value: qrValue, label: g.session.label })}>
                  Tap QR to enlarge
                </button>
              </div>
              <button className="qrTapTarget" onClick={() => setExpandedQR({ value: qrValue, label: g.session.label })}>
                <QRCanvas value={qrValue} />
              </button>
            </div>
            <button className="cancelLink" onClick={() => cancelSpot(g.participantId)}>Cancel my spot</button>
          </div>
        );
      })}

      {tournaments.map((t) => {
        const dateStr = t.event_date
          ? new Date(t.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '';
        return (
          <div key={t.regId} className="ticket">
            <div className="ticketTop">
              <div>
                <div className="rowTags"><Tag tone="tourney">{"\u{1F3C6}"} TOURNAMENT</Tag></div>
                <div className="cardTitle">{t.name}</div>
                <div className="cardMeta">{t.courtName} {dateStr ? `· ${dateStr}` : ''}</div>
              </div>
              <div className="tourneyTicketBadge">{"\u{1F3C6}"}</div>
            </div>
          </div>
        );
      })}

      {waitlisted.length > 0 && (
        <>
          <div className="h2" style={{ marginTop: 16 }}>{"\u{1F514}"} WAITLISTED</div>
          {waitlisted.map((g) => (
            <div key={g.participantId} className="ticket waitlistTicket">
              <div>
                <div className="cardTitle">{g.session.label || 'Session'}</div>
                <div className="cardMeta">{g.court?.name}</div>
              </div>
              <button className="ghostBtn smallBtn" onClick={() => leaveWaitlist(g.participantId)}>Leave</button>
            </div>
          ))}
        </>
      )}

      {expandedQR && (
        <QRExpanded
          value={expandedQR.value}
          label={expandedQR.label}
          onClose={() => setExpandedQR(null)}
        />
      )}
    </div>
  );
}
