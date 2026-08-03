import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { renderWithMentions } from '../lib/utils';
import { PersonAvatar } from './ui';

export default function CommentsSheet({ postId, onClose }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) loadComments();
  }, [postId]);

  async function loadComments() {
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:profile_id(id, full_name, photo_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments(data || []);
    setLoading(false);
  }

  async function handleSend() {
    if (!text.trim() || !user) return;
    await supabase.from('comments').insert({
      post_id: postId,
      profile_id: user.id,
      text_content: text.trim(),
    });
    setText('');
    loadComments();
  }

  return (
    <div className="sheetScrim" onClick={onClose}>
      <div className="sheet commentsSheetBox" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <h3 className="h1" style={{ fontSize: 18 }}>Comments</h3>
        <div className="commentsList">
          {loading && <p style={{ color: C.sand, fontSize: 13 }}>Loading…</p>}
          {!loading && comments.length === 0 && (
            <p style={{ color: C.sand, fontSize: 13 }}>No comments yet. Be the first!</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="commentRow">
              <PersonAvatar
                name={c.profiles?.full_name}
                photo={c.profiles?.photo_url}
                size={32}
              />
              <div className="commentBody">
                <div className="commentName">{c.profiles?.full_name || 'Unknown'}</div>
                <div className="commentText">{renderWithMentions(c.text_content)}</div>
                <div className="commentTime">
                  {new Date(c.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="commentInputRow">
          <input
            className="commentInput"
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            className="composerPostBtn"
            disabled={!text.trim()}
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
