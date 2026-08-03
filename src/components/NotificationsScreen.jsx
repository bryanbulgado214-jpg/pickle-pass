import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';

export default function NotificationsScreen({ onBack }) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
  }, []);

  async function loadNotifs() {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifs(data || []);
    setLoading(false);
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('profile_id', user.id)
      .eq('read', false);
    loadNotifs();
  }

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"← Back"}</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 className="h1">Notifications</h1>
        {unreadCount > 0 && (
          <button className="markReadBtn" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {loading && <p style={{ color: C.sand, fontSize: 13 }}>Loading…</p>}

      {!loading && notifs.length === 0 && (
        <div className="empty">
          <p style={{ color: C.sand, fontSize: 14 }}>No notifications yet.</p>
        </div>
      )}

      {notifs.map((n) => (
        <div key={n.id} className={"notifRow" + (n.read ? "" : " unread")}>
          <span className="notifIcon">{n.icon || "\u{1F514}"}</span>
          <div className="notifBody">
            <div className="notifText">{n.text_content}</div>
            <div className="notifTime">
              {new Date(n.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </div>
          </div>
          {!n.read && <div className="notifDot" />}
        </div>
      ))}
    </div>
  );
}
