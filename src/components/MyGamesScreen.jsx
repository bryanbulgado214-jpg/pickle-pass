import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Ball, Tag } from './ui';

export default function MyGamesScreen() {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState([]);
  const [waitlisted, setWaitlisted] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      .select('*, tournament:tournament_id(id, name, date_text, court:court_id(id, name))')
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

      {confirmed.map((g) => (
        <div key={g.participantId} className="ticket">
          <div className="ticketTop">
            <div>
              <div className="cardTitle">{g.session.label || 'Session'}</div>
              <div className="cardMeta">{g.court?.name} {g.session.schedule_text ? `· ${g.session.schedule_text}` : ''}</div>
            </div>
            <div className="qr" aria-label="QR gate pass">
              {Array.from({ length: 25 }).map((_, i) => (
                <span key={i} style={{ opacity: (i * 7) % 3 ? 1 : 0.15 }} />
              ))}
            </div>
          </div>
          <button className="cancelLink" onClick={() => cancelSpot(g.participantId)}>Cancel my spot</button>
        </div>
      ))}

      {tournaments.map((t) => (
        <div key={t.regId} className="ticket">
          <div className="ticketTop">
            <div>
              <div className="rowTags"><Tag tone="tourney">{"\u{1F3C6}"} TOURNAMENT</Tag></div>
              <div className="cardTitle">{t.name}</div>
              <div className="cardMeta">{t.courtName} {t.date_text ? `· ${t.date_text}` : ''}</div>
            </div>
            <div className="tourneyTicketBadge">{"\u{1F3C6}"}</div>
          </div>
        </div>
      ))}

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
    </div>
  );
}
