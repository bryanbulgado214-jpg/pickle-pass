import { C, LEAGUES, CURRENT_LEAGUE_INDEX, PROMOTE_COUNT, RELEGATE_COUNT } from '../lib/constants';
import { PersonAvatar } from './ui';
import { useAuth } from '../contexts/AuthContext';

export default function LeaderboardScreen({ onBack }) {
  const { profile } = useAuth();
  const league = LEAGUES[CURRENT_LEAGUE_INDEX];

  const entries = [
    { id: 'you', name: profile?.full_name || 'You', xp: profile?.weekly_xp || 0, isYou: true },
  ];

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"←"} Profile</button>
      <div className="paneHead">
        <div className="h1">{"\u{1F3C6}"} {league.name.toUpperCase()}</div>
        <div className="sub">Weekly leaderboard</div>
      </div>

      <div className="leagueLadder">
        {LEAGUES.map((l) => (
          <span
            key={l.id}
            className={"ladderChip" + (l.id === league.id ? " ladderOn" : "")}
            style={l.id === league.id ? { borderColor: l.color, color: l.color } : {}}
          >
            {l.name.split(' ')[0]}
          </span>
        ))}
      </div>

      <div className="leagueLegend">
        <span><span className="legendDot promote" /> Top {PROMOTE_COUNT} promote</span>
        <span><span className="legendDot relegate" /> Bottom {RELEGATE_COUNT} relegate</span>
      </div>

      {entries.map((e, i) => {
        const rank = i + 1;
        const zone = rank <= PROMOTE_COUNT ? 'promote' : rank > entries.length - RELEGATE_COUNT ? 'relegate' : '';
        return (
          <div key={e.id} className={'leaderRow ' + zone + (e.isYou ? ' you' : '')}>
            <div className="leaderRank">{rank <= 3 ? ['\u{1F947}', '\u{1F948}', '\u{1F949}'][rank - 1] : rank}</div>
            <div className="feedAvatar"><PersonAvatar name={e.name} size={36} /></div>
            <div className="leaderName">{e.isYou ? 'You' : e.name}</div>
            <div className="leaderXp">{e.xp} XP</div>
          </div>
        );
      })}

      {entries.length <= 1 && (
        <div className="fine" style={{ textAlign: 'center', marginTop: 20 }}>
          More players will appear as the community grows.
        </div>
      )}
    </div>
  );
}
