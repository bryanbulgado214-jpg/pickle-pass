import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { PersonAvatar, Ball } from './ui';

export default function NetworkScreen({ onBack, onOpenProfile }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('connections');
  const [connections, setConnections] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNetwork();
  }, []);

  async function loadNetwork() {
    setLoading(true);

    const { data: connData } = await supabase
      .from('connections')
      .select('*, profile_a:profile_id_a(id, full_name, photo_url), profile_b:profile_id_b(id, full_name, photo_url)')
      .or(`profile_id_a.eq.${user.id},profile_id_b.eq.${user.id}`);
    const connProfiles = (connData || []).map((c) =>
      c.profile_id_a === user.id ? c.profile_b : c.profile_a
    ).filter(Boolean);
    setConnections(connProfiles);

    const { data: inReqs } = await supabase
      .from('connection_requests')
      .select('*, sender:sender_id(id, full_name, photo_url)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
    setIncoming((inReqs || []).map((r) => ({ ...r.sender, requestId: r.id })));

    const { data: outReqs } = await supabase
      .from('connection_requests')
      .select('*, receiver:receiver_id(id, full_name, photo_url)')
      .eq('sender_id', user.id)
      .eq('status', 'pending');
    setSent((outReqs || []).map((r) => ({ ...r.receiver, requestId: r.id })));

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url')
      .neq('id', user.id)
      .limit(30);
    setAllProfiles(profiles || []);

    setLoading(false);
  }

  async function sendRequest(profileId) {
    await supabase.from('connection_requests').insert({
      sender_id: user.id,
      receiver_id: profileId,
      status: 'pending',
    });
    loadNetwork();
  }

  async function cancelRequest(requestId) {
    await supabase.from('connection_requests').delete().eq('id', requestId);
    loadNetwork();
  }

  async function acceptRequest(req) {
    await supabase.from('connection_requests')
      .update({ status: 'accepted' })
      .eq('id', req.requestId);
    await supabase.from('connections').insert({
      profile_id_a: user.id,
      profile_id_b: req.id,
    });
    loadNetwork();
  }

  async function declineRequest(requestId) {
    await supabase.from('connection_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);
    loadNetwork();
  }

  const connectedIds = new Set(connections.map((c) => c.id));
  const sentIds = new Set(sent.map((s) => s.id));
  const incomingIds = new Set(incoming.map((i) => i.id));

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"←"} Back</button>
      <div className="paneHead">
        <div className="h1">MY NETWORK</div>
        <div className="sub">Connect with other players</div>
      </div>

      <div className="segment networkSeg">
        {[
          ['connections', `Connections (${connections.length})`],
          ['requests', incoming.length ? `Requests (${incoming.length})` : 'Requests'],
          ['discover', 'Discover'],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? 'segOn' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {loading && <p style={{ color: C.sand, fontSize: 13 }}>Loading...</p>}

      {!loading && tab === 'connections' && (
        connections.length === 0 ? (
          <div className="empty">
            <Ball size={30} />
            <div className="cardTitle" style={{ marginTop: 10 }}>No connections yet</div>
            <div className="sub">Send requests from the Discover tab.</div>
          </div>
        ) : connections.map((p) => (
          <div key={p.id} className="playerRow" onClick={() => onOpenProfile?.(p.id)}>
            <div className="feedAvatar"><PersonAvatar name={p.full_name} photo={p.photo_url} size={44} /></div>
            <div className="playerInfo">
              <div className="feedName">{p.full_name}</div>
            </div>
            <span className="connectedTag">{"✓"} Connected</span>
          </div>
        ))
      )}

      {!loading && tab === 'requests' && (
        <>
          <div className="h2" style={{ marginTop: 0 }}>RECEIVED</div>
          {incoming.length === 0 ? (
            <div className="fine" style={{ marginBottom: 16 }}>No pending requests.</div>
          ) : incoming.map((p) => (
            <div key={p.id} className="playerRow">
              <div className="feedAvatar"><PersonAvatar name={p.full_name} photo={p.photo_url} size={44} /></div>
              <div className="playerInfo">
                <div className="feedName">{p.full_name}</div>
                <div className="feedTime">wants to connect</div>
              </div>
              <div className="requestBtnRow">
                <button className="connectBtn" onClick={() => acceptRequest(p)}>Accept</button>
                <button className="declineBtn" onClick={() => declineRequest(p.requestId)}>Decline</button>
              </div>
            </div>
          ))}

          {sent.length > 0 && (
            <>
              <div className="h2">SENT</div>
              {sent.map((p) => (
                <div key={p.id} className="playerRow">
                  <div className="feedAvatar"><PersonAvatar name={p.full_name} photo={p.photo_url} size={44} /></div>
                  <div className="playerInfo">
                    <div className="feedName">{p.full_name}</div>
                    <div className="feedTime">Request pending</div>
                  </div>
                  <button className="connectBtn connected" onClick={() => cancelRequest(p.requestId)}>Cancel</button>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {!loading && tab === 'discover' && allProfiles.map((p) => (
        <div key={p.id} className="playerRow" onClick={() => onOpenProfile?.(p.id)}>
          <div className="feedAvatar"><PersonAvatar name={p.full_name} photo={p.photo_url} size={44} /></div>
          <div className="playerInfo">
            <div className="feedName">{p.full_name}</div>
          </div>
          {connectedIds.has(p.id) ? (
            <span className="connectedTag">{"✓"} Connected</span>
          ) : sentIds.has(p.id) ? (
            <button className="connectBtn connected" onClick={(e) => { e.stopPropagation(); cancelRequest(sent.find((s) => s.id === p.id)?.requestId); }}>Requested</button>
          ) : incomingIds.has(p.id) ? (
            <button className="connectBtn" onClick={(e) => { e.stopPropagation(); acceptRequest(incoming.find((i) => i.id === p.id)); }}>Accept</button>
          ) : (
            <button className="connectBtn" onClick={(e) => { e.stopPropagation(); sendRequest(p.id); }}>Connect</button>
          )}
        </div>
      ))}
    </div>
  );
}
