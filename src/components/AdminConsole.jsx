import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Tag, Ball, LoadingBall } from './ui';

export default function AdminConsole({ onBack }) {
  const { profile } = useAuth();

  if (!profile?.is_admin) {
    return (
      <div className="pane">
        <button className="back" onClick={onBack}>{"←"} Back</button>
        <div className="empty">
          <div className="cardTitle">Access denied</div>
          <div className="sub">Admin privileges required.</div>
        </div>
      </div>
    );
  }
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    const { data: pendingPosts } = await supabase
      .from('posts')
      .select('*, profiles:profile_id(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPosts(pendingPosts || []);

    const { data: pendingCourts } = await supabase
      .from('courts')
      .select('*')
      .eq('owner_status', 'pending')
      .order('created_at', { ascending: false });
    setCourts(pendingCourts || []);
    setLoading(false);
  }

  async function approvePost(id) {
    await supabase.from('posts').update({ status: 'approved' }).eq('id', id);
    loadQueue();
  }

  async function rejectPost(id) {
    await supabase.from('posts').update({ status: 'rejected' }).eq('id', id);
    loadQueue();
  }

  async function approveCourt(id) {
    await supabase.from('courts').update({ owner_status: 'approved', verified: true }).eq('id', id);
    loadQueue();
  }

  async function rejectCourt(id) {
    await supabase.from('courts').update({ owner_status: 'rejected' }).eq('id', id);
    loadQueue();
  }

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"←"} Back</button>
      <div className="paneHead">
        <div className="h1">ADMIN CONSOLE</div>
        <div className="sub">Review queue for posts and court verifications</div>
      </div>

      <div className="segment">
        <button className={tab === 'posts' ? 'segOn' : ''} onClick={() => setTab('posts')}>
          Posts ({posts.length})
        </button>
        <button className={tab === 'courts' ? 'segOn' : ''} onClick={() => setTab('courts')}>
          Courts ({courts.length})
        </button>
      </div>

      {loading && <LoadingBall />}

      {!loading && tab === 'posts' && (
        posts.length === 0 ? (
          <div className="empty">
            <Ball size={30} />
            <div className="cardTitle" style={{ marginTop: 10 }}>Queue empty</div>
            <div className="sub">No posts awaiting review.</div>
          </div>
        ) : posts.map((p) => (
          <div key={p.id} className="adminCard">
            <div className="adminCardHead">
              <Tag tone={p.kind || 'open'}>{p.kind?.toUpperCase() || 'POST'}</Tag>
              <span className="feedName">{p.profiles?.full_name}</span>
            </div>
            {p.body && <div className="adminBody">{p.body}</div>}
            <div className="adminActions">
              <button className="connectBtn" onClick={() => approvePost(p.id)}>Approve</button>
              <button className="declineBtn" onClick={() => rejectPost(p.id)}>Reject</button>
            </div>
          </div>
        ))
      )}

      {!loading && tab === 'courts' && (
        courts.length === 0 ? (
          <div className="empty">
            <Ball size={30} />
            <div className="cardTitle" style={{ marginTop: 10 }}>Queue empty</div>
            <div className="sub">No court verifications pending.</div>
          </div>
        ) : courts.map((ct) => (
          <div key={ct.id} className="adminCard">
            <div className="adminCardHead">
              <Tag tone="training">COURT</Tag>
              <span className="feedName">{ct.name}</span>
            </div>
            <div className="adminBody">{ct.town} {"·"} {ct.lat?.toFixed(4)}, {ct.lng?.toFixed(4)}</div>
            <div className="adminActions">
              <button className="connectBtn" onClick={() => approveCourt(ct.id)}>Verify</button>
              <button className="declineBtn" onClick={() => rejectCourt(ct.id)}>Reject</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
