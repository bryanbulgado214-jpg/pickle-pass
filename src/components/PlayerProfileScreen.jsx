import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PersonAvatar, CourtBackdrop } from './ui';

export default function PlayerProfileScreen({ profileId, onBack }) {
  const { user } = useAuth();
  const [person, setPerson] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  async function loadProfile() {
    setLoading(true);
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    setPerson(prof);

    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .or(`and(profile_id_a.eq.${user.id},profile_id_b.eq.${profileId}),and(profile_id_a.eq.${profileId},profile_id_b.eq.${user.id})`)
      .limit(1);
    if (conn && conn.length > 0) {
      setConnectionStatus('connected');
    } else {
      const { data: sent } = await supabase
        .from('connection_requests')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', profileId)
        .eq('status', 'pending')
        .limit(1);
      if (sent && sent.length > 0) {
        setConnectionStatus('sent');
        setRequestId(sent[0].id);
      } else {
        const { data: recv } = await supabase
          .from('connection_requests')
          .select('id')
          .eq('sender_id', profileId)
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .limit(1);
        if (recv && recv.length > 0) {
          setConnectionStatus('incoming');
          setRequestId(recv[0].id);
        } else {
          setConnectionStatus(null);
        }
      }
    }
    setLoading(false);
  }

  async function sendRequest() {
    await supabase.from('connection_requests').insert({
      sender_id: user.id,
      receiver_id: profileId,
      status: 'pending',
    });
    loadProfile();
  }

  async function cancelRequest() {
    if (requestId) {
      await supabase.from('connection_requests').delete().eq('id', requestId);
    }
    loadProfile();
  }

  async function acceptRequest() {
    if (requestId) {
      await supabase.from('connection_requests').update({ status: 'accepted' }).eq('id', requestId);
      await supabase.from('connections').insert({
        profile_id_a: user.id,
        profile_id_b: profileId,
      });
    }
    loadProfile();
  }

  if (loading || !person) {
    return (
      <div className="pane">
        <button className="back" onClick={onBack}>{"←"} Back</button>
        <p style={{ color: '#B8C9CF', fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"←"} Back</button>
      <div className="profileHero">
        <CourtBackdrop />
        <div className="profilePhotoBig">
          <PersonAvatar name={person.full_name} photo={person.photo_url} size={140} />
        </div>
      </div>
      <div className="profileNameRow">
        <div className="profileName">{person.full_name}</div>
      </div>
      <div className="sub" style={{ marginBottom: 16 }}>
        Member since {new Date(person.member_since || person.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>

      {connectionStatus === 'connected' ? (
        <div className="joinedBanner">{"✓"} You{"'"}re connected with {person.full_name?.split(' ')[0]}.</div>
      ) : connectionStatus === 'incoming' ? (
        <button className="cta" onClick={acceptRequest}>Accept connection request</button>
      ) : connectionStatus === 'sent' ? (
        <button className="ghostBtn" onClick={cancelRequest}>Cancel request</button>
      ) : (
        <button className="cta" onClick={sendRequest}>Connect</button>
      )}
    </div>
  );
}
