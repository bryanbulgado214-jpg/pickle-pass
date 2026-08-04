import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { C } from '../lib/constants';

export default function TournamentCard({ tournament, court, onOpen }) {
  const [regCount, setRegCount] = useState(0);

  useEffect(() => {
    supabase
      .from('tournament_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id)
      .then(({ count }) => setRegCount(count || 0));
  }, [tournament.id]);

  const full = regCount >= tournament.max_teams;
  const pct = Math.min(100, (regCount / tournament.max_teams) * 100);
  const dateStr = tournament.event_date
    ? new Date(tournament.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  return (
    <button className="tourneyCard" onClick={() => onOpen({ ...tournament, _regCount: regCount })}>
      <div className="tourneyBanner">
        <span className="tourneyTag">{"\u{1F3C6}"} TOURNAMENT</span>
        <div className="tourneyName">{tournament.name}</div>
      </div>
      <div className="tourneyBody">
        <div className="tourneyMeta">{court?.name}{court?.verified && <span className="verifiedTick">{"✓"}</span>} {"·"} {dateStr}</div>
        <div className="tourneyFee">{"₱"}{tournament.fee} <span className="feeUnit">{tournament.fee_unit || 'per team'}</span></div>
        <div className="tourneyCapTrack"><div className="tourneyCapFill" style={{ width: pct + '%' }} /></div>
        <div className="tourneyCapNote">{full ? 'Full — join waitlist' : `${regCount}/${tournament.max_teams} teams registered`}</div>
      </div>
    </button>
  );
}
