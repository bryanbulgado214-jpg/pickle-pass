import { C } from '../lib/constants';

export default function TournamentCard({ tournament, court, onOpen }) {
  const full = tournament.registered >= tournament.max_teams;
  const pct = Math.min(100, (tournament.registered / tournament.max_teams) * 100);
  return (
    <button className="tourneyCard" onClick={() => onOpen(tournament)}>
      <div className="tourneyBanner">
        <span className="tourneyTag">{"\u{1F3C6}"} TOURNAMENT</span>
        <div className="tourneyName">{tournament.name}</div>
      </div>
      <div className="tourneyBody">
        <div className="tourneyMeta">{court?.name}{court?.verified && <span className="verifiedTick">{"✓"}</span>} {"·"} {tournament.date_text}</div>
        <div className="tourneyFee">{"₱"}{tournament.fee} <span className="feeUnit">{tournament.fee_unit || 'per team'}</span></div>
        <div className="tourneyCapTrack"><div className="tourneyCapFill" style={{ width: pct + '%' }} /></div>
        <div className="tourneyCapNote">{full ? 'Full — join waitlist' : `${tournament.registered}/${tournament.max_teams} teams registered`}</div>
      </div>
    </button>
  );
}
