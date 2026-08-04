import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { PersonAvatar, LoadingBall } from './ui';

function ClubForm({ onCreated, onCancel }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { data, error: insertErr } = await supabase.from('clubs').insert({
      name: name.trim(),
      description: desc.trim(),
      owner_id: user.id,
    }).select().single();
    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }
    if (data) {
      const { error: memberErr } = await supabase.from('club_members').insert({
        club_id: data.id,
        profile_id: user.id,
        role: 'owner',
      });
      if (memberErr) {
        setError(memberErr.message);
        setSaving(false);
        return;
      }
      onCreated();
    }
    setSaving(false);
  }

  return (
    <div className="pane">
      <button className="back" onClick={onCancel}>{"← Back"}</button>
      <div className="h1">CREATE A CLUB</div>
      <div className="sub">Start a pickleball group on Siquijor</div>
      {error && <div className="errorBanner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="formRow" style={{ marginTop: 16 }}>
          <label>CLUB NAME</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Siquijor Smashers" />
        </div>
        <div className="formRow">
          <label>DESCRIPTION</label>
          <textarea className="composerInput" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's your club about?" />
        </div>
        <button className="cta" type="submit" disabled={saving || !name.trim()}>
          {saving ? 'Creating...' : 'Create Club'}
        </button>
      </form>
    </div>
  );
}

function ClubDetail({ club, onBack }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [club.id]);

  async function loadMembers() {
    setLoading(true);
    const { data } = await supabase
      .from('club_members')
      .select('*, profiles:profile_id(id, full_name, photo_url)')
      .eq('club_id', club.id)
      .order('joined_at', { ascending: true });
    setMembers(data || []);
    setIsMember((data || []).some((m) => m.profile_id === user.id));
    setLoading(false);
  }

  async function handleJoin() {
    await supabase.from('club_members').insert({
      club_id: club.id,
      profile_id: user.id,
      role: 'member',
    });
    loadMembers();
  }

  async function handleLeave() {
    await supabase.from('club_members').delete()
      .eq('club_id', club.id)
      .eq('profile_id', user.id);
    loadMembers();
  }

  const isOwner = club.owner_id === user.id;

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"← Back"}</button>

      <div className="clubHero">
        <div className="clubInitial">{club.name.charAt(0).toUpperCase()}</div>
      </div>

      <div className="h1" style={{ marginTop: 12 }}>{club.name}</div>
      {club.description && <div className="sub" style={{ marginTop: 4 }}>{club.description}</div>}
      <div className="cardMeta" style={{ marginTop: 6 }}>
        {members.length} member{members.length !== 1 ? 's' : ''}
        {isOwner && ' · You own this club'}
      </div>

      {!loading && !isMember && (
        <button className="cta" onClick={handleJoin}>Join Club</button>
      )}
      {!loading && isMember && !isOwner && (
        <button className="cancelLink" onClick={handleLeave} style={{ marginTop: 12 }}>Leave Club</button>
      )}

      <div className="h2">MEMBERS</div>
      {members.map((m) => (
        <div key={m.id} className="playerRow">
          <PersonAvatar name={m.profiles?.full_name} photo={m.profiles?.photo_url} size={38} />
          <div className="playerInfo">
            <div className="feedName">{m.profiles?.full_name || 'Player'}</div>
            <div className="cardMeta">{m.role === 'owner' ? 'Owner' : 'Member'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ClubScreen({ onBack }) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    loadClubs();
  }, []);

  async function loadClubs() {
    setLoading(true);
    const { data } = await supabase
      .from('clubs')
      .select('*, club_members(count)')
      .order('created_at', { ascending: false });
    setClubs(data || []);
    setLoading(false);
  }

  if (creating) {
    return <ClubForm onCreated={() => { setCreating(false); loadClubs(); }} onCancel={() => setCreating(false)} />;
  }

  if (detail) {
    return <ClubDetail club={detail} onBack={() => { setDetail(null); loadClubs(); }} />;
  }

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"← Back"}</button>
      <div className="paneHead">
        <div className="h1">CLUBS</div>
        <div className="sub">Join a pickleball group or start your own</div>
      </div>

      <button className="cta" onClick={() => setCreating(true)} style={{ marginBottom: 16 }}>
        + Create a Club
      </button>

      {loading && <LoadingBall text="Loading clubs…" />}

      {!loading && clubs.length === 0 && (
        <div className="empty">
          <div className="cardTitle">No clubs yet</div>
          <div className="sub" style={{ marginTop: 6 }}>Be the first to create one!</div>
        </div>
      )}

      {clubs.map((c) => {
        const memberCount = c.club_members?.[0]?.count || 0;
        return (
          <button key={c.id} className="clubRow" onClick={() => setDetail(c)}>
            <div className="clubRowIcon">{c.name.charAt(0).toUpperCase()}</div>
            <div className="playerInfo">
              <div className="feedName">{c.name}</div>
              <div className="cardMeta">{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
            </div>
            <span className="profileLinkVal">{"→"}</span>
          </button>
        );
      })}
    </div>
  );
}
