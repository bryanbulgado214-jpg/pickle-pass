import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { PersonAvatar } from './ui';

export default function ChatThread({ otherUser, onBack, onOpenProfile }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`dm-${otherUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      }, (payload) => {
        const msg = payload.new;
        if (
          (msg.sender_id === user.id && msg.receiver_id === otherUser.id) ||
          (msg.sender_id === otherUser.id && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [otherUser.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    const newMsg = {
      sender_id: user.id,
      receiver_id: otherUser.id,
      text: text.trim(),
    };
    setText('');
    await supabase.from('direct_messages').insert(newMsg);
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="pane chatPane">
      <div className="chatHeader">
        <button className="back" onClick={onBack} style={{ padding: 0 }}>{"←"}</button>
        <button className="chatHeaderProfile" onClick={() => onOpenProfile?.(otherUser.id)}>
          <PersonAvatar name={otherUser.full_name} photo={otherUser.photo_url} size={32} />
          <span className="feedName">{otherUser.full_name || 'Player'}</span>
        </button>
      </div>

      <div className="chatMessages">
        {messages.length === 0 && (
          <div className="chatEmpty">
            <div className="sub">Start a conversation with {otherUser.full_name?.split(' ')[0] || 'this player'}</div>
          </div>
        )}
        {messages.map((msg, i) => {
          const mine = msg.sender_id === user.id;
          return (
            <div key={msg.id || i} className={"chatBubbleRow" + (mine ? " mine" : "")}>
              <div className={"chatBubble" + (mine ? " mine" : "")}>
                <div className="chatBubbleText">{msg.text}</div>
                <div className="chatBubbleTime">
                  {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chatInputRow">
        <input
          className="chatInput"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="chatSendBtn"
          disabled={!text.trim() || sending}
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
