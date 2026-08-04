import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Tag } from './ui';
import TourneyRegisterSheet from './TourneyRegisterSheet';

export default function TournamentDetail({ tournament, court, onBack }) {
  const { user } = useAuth();
  const [registered, setRegistered] = useState(false);
  const [regCount, setRegCount] = useState(tournament._regCount || 0);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    checkRegistration();
    loadRegCount();
  }, [tournament.id]);

  async function checkRegistration() {
    setLoading(true);
    const { data } = await supabase
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournament.id)
      .eq('profile_id', user.id)
      .limit(1);
    setRegistered(data && data.length > 0);
    setLoading(false);
  }

  async function loadRegCount() {
    const { count } = await supabase
      .from('tournament_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id);
    setRegCount(count || 0);
  }

  async function handleConfirmRegister() {
    await supabase.from('tournament_registrations').insert({
      tournament_id: tournament.id,
      profile_id: user.id,
    });
    setShowSheet(false);
    checkRegistration();
    loadRegCount();
  }

  const full = regCount >= tournament.max_teams;
  const pct = Math.min(100, (regCount / tournament.max_teams) * 100);
  const dateStr = tournament.event_date
    ? new Date(tournament.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"←"} Tournaments</button>
      <div className="hero heroGold">
        <div className="heroCourtLines"><div className="heroKitchen" /></div>
        <div className="heroBody">
          <div className="rowTags"><Tag tone="tourney">{"\u{1F3C6}"} TOURNAMENT</Tag></div>
          <div className="heroTitle">{tournament.name}</div>
          <div className="heroSub">{court?.name} {"·"} {court?.town}</div>
        </div>
      </div>

      {tournament.tagline && (
        <div className="sub" style={{ marginBottom: 12 }}>{tournament.tagline}</div>
      )}

      <div className="statGrid">
        <div className="stat"><div className="statK">DATE</div><div className="statV">{dateStr}</div></div>
        <div className="stat"><div className="statK">ENTRY FEE</div><div className="statV">{"₱"}{tournament.fee} {tournament.fee_unit || 'per team'}</div></div>
        <div className="stat"><div className="statK">MAX TEAMS</div><div className="statV">{tournament.max_teams}</div></div>
        <div className="stat"><div className="statK">PRIZE</div><div className="statV">{tournament.prize || 'TBA'}</div></div>
      </div>

      {tournament.categories && tournament.categories.length > 0 && (
        <div className="block">
          <div className="h2">CATEGORIES</div>
          <div className="rowTags">{tournament.categories.map((c) => <Tag key={c} tone="training">{c}</Tag>)}</div>
        </div>
      )}

      <div className="block">
        <div className="h2">REGISTRATION</div>
        <div className="capScore" style={{ color: full ? C.coral : '#D4AF37' }}>
          {regCount}<span className="capSlash">/</span>{tournament.max_teams}
        </div>
        <div className="capTrack">
          <div className="capFill" style={{ width: pct + '%', background: full ? C.coral : '#D4AF37' }} />
        </div>
        <div className="capNote">{full ? 'Full — join waitlist' : `${tournament.max_teams - regCount} spots left`}</div>
      </div>

      {!loading && (registered ? (
        <div className="joinedBanner">{"✓"} You{"'"}re registered! Bracket and match times post closer to the date.</div>
      ) : (
        <button className="cta" disabled={full} onClick={() => setShowSheet(true)}>
          {full ? 'Full — join waitlist' : `Register · ₱${tournament.fee} ${tournament.fee_unit || 'per team'}`}
        </button>
      ))}

      {showSheet && (
        <TourneyRegisterSheet
          tournament={tournament}
          onClose={() => setShowSheet(false)}
          onConfirm={handleConfirmRegister}
        />
      )}
    </div>
  );
}
