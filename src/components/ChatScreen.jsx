import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { PersonAvatar, Ball, LoadingBall } from './ui';
import ChatThread from './ChatThread';

export default function ChatScreen({ onBack, onOpenProfile, onRead }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState(null);

  useEffect(() => {
    loadConversations();
    onRead?.();
  }, []);

  async function loadConversations() {
    setLoading(true);

    const { data: sent } = await supabase
      .from('direct_messages')
      .select('*, receiver:receiver_id(id, full_name, photo_url)')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    const { data: received } = await supabase
      .from('direct_messages')
      .select('*, sender:sender_id(id, full_name, photo_url)')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false });

    const allMessages = [...(sent || []), ...(received || [])];
    const convMap = {};

    allMessages.forEach((m) => {
      const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      const otherProfile = m.sender_id === user.id ? m.receiver : m.sender;
      if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].lastTime)) {
        convMap[otherId] = {
          profileId: otherId,
          profile: otherProfile,
          lastMessage: m.text,
          lastTime: m.created_at,
          isFromMe: m.sender_id === user.id,
        };
      }
    });

    const sorted = Object.values(convMap).sort(
      (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
    );
    setConversations(sorted);
    setLoading(false);
  }

  if (activeThread) {
    return (
      <ChatThread
        otherUser={activeThread}
        onBack={() => { setActiveThread(null); loadConversations(); }}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"←"} Back</button>
      <div className="paneHead">
        <div className="h1">MESSAGES</div>
        <div className="sub">Chat with your connections</div>
      </div>

      {loading && <LoadingBall text="Loading chats…" />}

      {!loading && conversations.length === 0 && (
        <div className="empty">
          <Ball size={30} />
          <div className="cardTitle" style={{ marginTop: 10 }}>No messages yet</div>
          <div className="sub">Open a player{"'"}s profile from your connections to start a conversation.</div>
        </div>
      )}

      {!loading && conversations.map((conv) => {
        const timeAgo = formatTimeAgo(conv.lastTime);
        return (
          <button
            key={conv.profileId}
            className="chatRow"
            onClick={() => setActiveThread(conv.profile)}
          >
            <div className="feedAvatar">
              <PersonAvatar name={conv.profile?.full_name} photo={conv.profile?.photo_url} size={44} />
            </div>
            <div className="chatRowBody">
              <div className="chatRowTop">
                <span className="feedName">{conv.profile?.full_name || 'Player'}</span>
                <span className="chatTime">{timeAgo}</span>
              </div>
              <div className="chatPreview">
                {conv.isFromMe ? 'You: ' : ''}{conv.lastMessage}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
