import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { PersonAvatar, LoadingBall } from './ui';

function ClubForm({ onCreated, onCancel }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    let photoUrl = null;
    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `clubs/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, photoFile, { upsert: false });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data, error: insertErr } = await supabase.from('clubs').insert({
      name: name.trim(),
      description: desc.trim(),
      owner_id: user.id,
      photo_url: photoUrl,
      max_members: maxMembers ? parseInt(maxMembers) : null,
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
        <div className="clubPhotoUpload" onClick={() => fileRef.current?.click()}>
          {photoPreview
            ? <img src={photoPreview} alt="" className="clubPhotoPreview" />
            : <div className="clubPhotoPlaceholder">{"\u{1F4F7}"} Add Photo</div>}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
        </div>
        <div className="formRow" style={{ marginTop: 16 }}>
          <label>CLUB NAME</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Siquijor Smashers" />
        </div>
        <div className="formRow">
          <label>DESCRIPTION</label>
          <textarea className="composerInput" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's your club about?" />
        </div>
        <div className="formRow">
          <label>MAX MEMBERS (optional)</label>
          <input className="input" type="number" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} placeholder="Leave empty for unlimited" />
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
  const [pendingMembers, setPendingMembers] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [myMembership, setMyMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const photoRef = useRef(null);

  useEffect(() => {
    loadMembers();
    loadPosts();
  }, [club.id]);

  async function loadMembers() {
    setLoading(true);
    const { data } = await supabase
      .from('club_members')
      .select('*, profiles:profile_id(id, full_name, photo_url)')
      .eq('club_id', club.id)
      .order('joined_at', { ascending: true });
    const all = data || [];
    setMembers(all.filter((m) => m.status !== 'pending'));
    setPendingMembers(all.filter((m) => m.status === 'pending'));
    const mine = all.find((m) => m.profile_id === user.id);
    setIsMember(!!mine && mine.status !== 'pending');
    setMyMembership(mine || null);
    setLoading(false);
  }

  async function handleJoin() {
    const status = club.max_members ? 'pending' : 'member';
    await supabase.from('club_members').insert({
      club_id: club.id,
      profile_id: user.id,
      role: 'member',
      status,
    });
    loadMembers();
  }

  async function handleLeave() {
    await supabase.from('club_members').delete()
      .eq('club_id', club.id)
      .eq('profile_id', user.id);
    loadMembers();
  }

  async function handleApprove(memberId) {
    await supabase.from('club_members')
      .update({ status: 'member' })
      .eq('id', memberId);
    loadMembers();
  }

  async function handleReject(memberId) {
    await supabase.from('club_members')
      .delete()
      .eq('id', memberId);
    loadMembers();
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `clubs/${club.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('profile-photos')
      .upload(path, file, { upsert: true });
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path);
      await supabase.from('clubs').update({ photo_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq('id', club.id);
      club.photo_url = `${urlData.publicUrl}?t=${Date.now()}`;
    }
    setUploading(false);
  }

  async function loadPosts() {
    const { data } = await supabase
      .from('club_posts')
      .select('*, profiles:author_id(id, full_name, photo_url), club_post_comments(*, profiles:author_id(id, full_name, photo_url))')
      .eq('club_id', club.id)
      .order('created_at', { ascending: false });
    setPosts(data || []);
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    await supabase.from('club_posts').insert({
      club_id: club.id,
      author_id: user.id,
      content: newPost.trim(),
    });
    setNewPost('');
    setPosting(false);
    loadPosts();
  }

  async function handleComment(postId) {
    const text = commentTexts[postId]?.trim();
    if (!text) return;
    await supabase.from('club_post_comments').insert({
      post_id: postId,
      author_id: user.id,
      content: text,
    });
    setCommentTexts((prev) => ({ ...prev, [postId]: '' }));
    loadPosts();
  }

  const isOwner = club.owner_id === user.id;
  const activeMembers = members.filter((m) => m.status !== 'pending');
  const isFull = club.max_members && activeMembers.length >= club.max_members;
  const isPending = myMembership?.status === 'pending';

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"← Back"}</button>

      <div className="clubHero">
        {club.photo_url
          ? <img src={club.photo_url} alt="" className="clubHeroImg" />
          : <div className="clubInitial">{club.name.charAt(0).toUpperCase()}</div>}
        {isOwner && (
          <button className="coverEditBtn" onClick={() => photoRef.current?.click()}>
            {uploading ? '...' : '\u{1F4F7}'}
          </button>
        )}
        <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
      </div>

      <div className="h1" style={{ marginTop: 12 }}>{club.name}</div>
      {club.description && <div className="sub" style={{ marginTop: 4 }}>{club.description}</div>}
      <div className="cardMeta" style={{ marginTop: 6 }}>
        {activeMembers.length}{club.max_members ? `/${club.max_members}` : ''} member{activeMembers.length !== 1 ? 's' : ''}
        {isOwner && ' · You own this club'}
      </div>

      {!loading && !isMember && !isPending && (
        isFull
          ? <div className="waitlistBanner" style={{ marginTop: 12 }}>This club is full</div>
          : <button className="cta" onClick={handleJoin}>
              {club.max_members ? 'Request to Join' : 'Join Club'}
            </button>
      )}
      {isPending && (
        <div className="waitlistBanner" style={{ marginTop: 12 }}>
          {"\u{23F3}"} Your request is pending approval
        </div>
      )}
      {!loading && isMember && !isOwner && (
        <button className="cancelLink" onClick={handleLeave} style={{ marginTop: 12 }}>Leave Club</button>
      )}

      {isOwner && pendingMembers.length > 0 && (
        <>
          <div className="h2">PENDING REQUESTS</div>
          {pendingMembers.map((m) => (
            <div key={m.id} className="playerRow">
              <PersonAvatar name={m.profiles?.full_name} photo={m.profiles?.photo_url} size={38} />
              <div className="playerInfo">
                <div className="feedName">{m.profiles?.full_name || 'Player'}</div>
                <div className="cardMeta">Wants to join</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="approveBtn" onClick={() => handleApprove(m.id)}>{"✓"}</button>
                <button className="rejectBtn" onClick={() => handleReject(m.id)}>{"✕"}</button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="segment" style={{ marginTop: 16 }}>
        <button className={activeTab === 'posts' ? 'segOn' : ''} onClick={() => setActiveTab('posts')}>Discussion</button>
        <button className={activeTab === 'members' ? 'segOn' : ''} onClick={() => setActiveTab('members')}>Members</button>
      </div>

      {activeTab === 'members' && (
        <>
          <div className="h2">MEMBERS</div>
          {members.filter((m) => m.status !== 'pending').map((m) => (
            <div key={m.id} className="playerRow">
              <PersonAvatar name={m.profiles?.full_name} photo={m.profiles?.photo_url} size={38} />
              <div className="playerInfo">
                <div className="feedName">{m.profiles?.full_name || 'Player'}</div>
                <div className="cardMeta">{m.role === 'owner' ? 'Owner' : 'Member'}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {activeTab === 'posts' && (
        <>
          {isMember && (
            <form className="clubPostForm" onSubmit={handlePost}>
              <textarea
                className="composerInput"
                rows={2}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Post an announcement..."
              />
              <button className="cta" type="submit" disabled={posting || !newPost.trim()} style={{ marginTop: 8 }}>
                {posting ? 'Posting...' : 'Post'}
              </button>
            </form>
          )}

          {posts.length === 0 && (
            <div className="empty" style={{ marginTop: 16 }}>
              <div className="cardTitle">No posts yet</div>
              <div className="sub" style={{ marginTop: 6 }}>
                {isMember ? 'Be the first to post something!' : 'Join to participate in discussions.'}
              </div>
            </div>
          )}

          {posts.map((post) => (
            <div key={post.id} className="clubPost">
              <div className="clubPostHeader">
                <PersonAvatar name={post.profiles?.full_name} photo={post.profiles?.photo_url} size={32} />
                <div className="playerInfo">
                  <div className="feedName">{post.profiles?.full_name || 'Member'}</div>
                  <div className="cardMeta">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
              </div>
              <div className="clubPostBody">{post.content}</div>

              {(post.club_post_comments || []).map((c) => (
                <div key={c.id} className="clubComment">
                  <PersonAvatar name={c.profiles?.full_name} photo={c.profiles?.photo_url} size={24} />
                  <div>
                    <span className="feedName" style={{ fontSize: 12 }}>{c.profiles?.full_name}</span>
                    <span className="clubCommentText">{c.content}</span>
                  </div>
                </div>
              ))}

              {isMember && (
                <div className="clubCommentForm">
                  <input
                    className="input"
                    value={commentTexts[post.id] || ''}
                    onChange={(e) => setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                    placeholder="Write a comment..."
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleComment(post.id); } }}
                  />
                  <button className="ghostBtn" onClick={() => handleComment(post.id)} style={{ padding: '6px 12px', fontSize: 13 }}>Reply</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}
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
            {c.photo_url
              ? <img src={c.photo_url} alt="" className="clubRowImg" />
              : <div className="clubRowIcon">{c.name.charAt(0).toUpperCase()}</div>}
            <div className="playerInfo">
              <div className="feedName">{c.name}</div>
              <div className="cardMeta">
                {memberCount}{c.max_members ? `/${c.max_members}` : ''} member{memberCount !== 1 ? 's' : ''}
              </div>
            </div>
            <span className="profileLinkVal">{"→"}</span>
          </button>
        );
      })}
    </div>
  );
}
