import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C, LEAGUES, CURRENT_LEAGUE_INDEX } from '../lib/constants';
import { PersonAvatar, CourtBackdrop } from './ui';

export default function ProfilePane({ onOpenNetwork, onOpenLeaderboard, onOpenReferral, onOpenPayments, onOpenClubs, theme, onToggleTheme }) {
  const { profile, updateProfile, signOut } = useAuth();
  const [connectionCount, setConnectionCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSkill, setEditSkill] = useState('');
  const [editHometown, setEditHometown] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

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

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('profile-photos')
      .upload(path, file, { upsert: true });
    if (upErr) {
      setUploadError('Photo upload failed — storage may not be configured yet.');
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(path);
    try {
      await updateProfile({ photo_url: `${urlData.publicUrl}?t=${Date.now()}` });
    } catch (err) {
      setUploadError('Photo saved but profile update failed.');
    }
    setUploading(false);
  }

  function startEdit() {
    setEditName(profile.full_name || '');
    setEditSkill(profile.skill_level || '');
    setEditHometown(profile.hometown || '');
    setEditBio(profile.bio || '');
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await updateProfile({
        full_name: editName.trim() || profile.full_name,
        skill_level: editSkill || null,
        hometown: editHometown.trim() || null,
        bio: editBio.trim() || null,
      });
      setEditing(false);
    } catch (err) {
      setUploadError('Failed to save profile changes.');
    }
    setSaving(false);
  }

  if (!profile) return null;
  const league = LEAGUES[CURRENT_LEAGUE_INDEX];

  return (
    <div className="pane">
      <div className="profileHero">
        <CourtBackdrop />
        <div className="profilePhotoBig" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
          <PersonAvatar name={profile.full_name} photo={profile.photo_url} size={90} />
          <div className="photoEditBadge">{uploading ? '...' : '\u{1F4F7}'}</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
        </div>
      </div>

      {uploadError && <div className="errorBanner">{uploadError}</div>}
      <div className="profileNameRow">
        <span className="profileName">{profile.full_name}</span>
        <button className="editProfileBtn" onClick={editing ? () => setEditing(false) : startEdit}>
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>
      <div className="sub">
        Member since {new Date(profile.member_since || profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        {profile.skill_level && <span> · {profile.skill_level}</span>}
        {profile.hometown && <span> · {profile.hometown}</span>}
      </div>
      {profile.bio && !editing && <div className="profileBio">{profile.bio}</div>}

      {editing && (
        <div className="editProfileForm">
          <label className="editField">
            <span className="editLabel">Name</span>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="editInput" />
          </label>
          <label className="editField">
            <span className="editLabel">Skill Level</span>
            <select value={editSkill} onChange={(e) => setEditSkill(e.target.value)} className="editInput">
              <option value="">Not set</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="editField">
            <span className="editLabel">Hometown</span>
            <input value={editHometown} onChange={(e) => setEditHometown(e.target.value)} className="editInput" placeholder="e.g. Siquijor" />
          </label>
          <label className="editField">
            <span className="editLabel">Bio</span>
            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="editInput" rows={2} placeholder="Tell others about yourself..." />
          </label>
          <button className="cta" onClick={saveEdit} disabled={saving} style={{ marginTop: 8 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      <div className="statGrid" style={{ marginTop: 14 }}>
        <div className="stat">
          <div className="statK">POINTS BALANCE</div>
          <div className="statV">{profile.points} pts</div>
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

      <button className="profileLinkRow" onClick={onOpenClubs}>
        <span>{"\u{1F3DB}\u{FE0F}"} Clubs</span>
        <span className="profileLinkVal">{"→"}</span>
      </button>

      <button className="profileLinkRow" onClick={onOpenReferral}>
        <span>{"\u{1F381}"} Invite Friends</span>
        <span className="profileLinkVal">{"→"}</span>
      </button>

      <button className="profileLinkRow" onClick={onOpenPayments}>
        <span>{"\u{1F4B3}"} Payment History</span>
        <span className="profileLinkVal">{"→"}</span>
      </button>

      <button className="profileLinkRow" onClick={onToggleTheme}>
        <span>{theme === 'dark' ? '\u{2600}\u{FE0F}' : '\u{1F319}'} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        <span className="profileLinkVal">{theme === 'dark' ? '☀️' : '🌙'}</span>
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
