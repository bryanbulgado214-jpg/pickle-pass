import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C, LEAGUES, CURRENT_LEAGUE_INDEX } from '../lib/constants';
import { PersonAvatar, CourtBackdrop } from './ui';

export default function ProfilePane({ onOpenNetwork, onOpenLeaderboard }) {
  const { profile, signOut } = useAuth();
  const [connectionCount, setConnectionCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    loadStats();
  }, [profile]);

  async function loadStats() {
    const { count: connCount } = await supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .or(`profile_id_a.eq.${profile.id},profile_id_b.eq.${profile.id}`);
    setConnectionCount(connCount || 0);

    const { count: sessCount } = await supabase
      .from('session_participants')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('status', 'confirmed');
    setSessionCount(sessCount || 0);
  }

  if (!profile) return null;
  const league = LEAGUES[CURRENT_LEAGUE_INDEX];

  return (
    <div className="pane">
      <div className="profileHero">
        <CourtBackdrop />
        <div className="profilePhotoBig">
          <PersonAvatar name={profile.full_name} photo={profile.photo_url} size={90} />
        </div>
      </div>

      <div className="profileNameRow">
        <span className="profileName">{profile.full_name}</span>
      </div>
      <div className="sub">
        Member since {new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>

      <div className="statGrid" style={{ marginTop: 14 }}>
        <div className="stat">
          <div className="statK">POINTS BALANCE</div>
          <div className="statV" style={{ color: C.ball }}>{profile.points} pts</div>
        </div>
        <div className="stat">
          <div className="statK">WEEKLY XP</div>
          <div className="statV">{profile.weekly_xp} XP</div>
        </div>
        <div className="stat">
          <div className="statK">SESSIONS PLAYED</div>
          <div className="statV">{sessionCount}</div>
        </div>
        <div className="stat">
          <div className="statK">EMAIL</div>
          <div className="statV" style={{ fontSize: 11 }}>{profile.email || '—'}</div>
        </div>
      </div>

      <button className="profileLinkRow" onClick={onOpenNetwork}>
        <span>Connections</span>
        <span className="profileLinkVal">{connectionCount} {"→"}</span>
      </button>

      <button
        className="leagueCard"
        onClick={onOpenLeaderboard}
        style={{ color: '#0A2E3C' }}
      >
        <div className="leagueCardTop">
          <span className="leagueBadge">{league.name}</span>
          <span className="leagueRank">Rank #—</span>
        </div>
        <div className="leagueXp">{profile.weekly_xp} XP this week</div>
        <div className="leagueCta">Tap to view leaderboard {"→"}</div>
      </button>

      <button
        className="cta"
        style={{ background: 'transparent', border: `1px solid rgba(242,246,241,0.25)`, color: C.line, marginTop: 20 }}
        onClick={signOut}
      >
        Log Out
      </button>
    </div>
  );
}
