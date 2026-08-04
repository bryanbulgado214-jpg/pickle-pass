import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import FeedPost from './FeedPost';
import PostComposer from './PostComposer';
import CommentsSheet from './CommentsSheet';
import { LoadingBall } from './ui';

export default function FeedScreen({ onOpenProfile }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [feedFilter, setFeedFilter] = useState('foryou');
  const [newCount, setNewCount] = useState(0);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: rawPosts, error: err } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:profile_id(id, full_name, photo_url),
        court:court_id(id, name),
        comments(id),
        reactions(id, reaction_type, profile_id)
      `)
      .in('status', ['approved', ...(user ? ['pending'] : [])])
      .order('created_at', { ascending: false })
      .limit(30);

    if (err) { setError(err.message); setLoading(false); return; }

    const enriched = (rawPosts || [])
      .filter((p) => p.status === 'approved' || p.profile_id === user?.id)
      .map((p) => {
        const reactionCounts = {};
        let myReaction = null;
        (p.reactions || []).forEach((r) => {
          reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
          if (r.profile_id === user?.id) myReaction = r.reaction_type;
        });
        return {
          ...p,
          reaction_counts: reactionCounts,
          my_reaction: myReaction,
          comment_count: p.comments?.length || 0,
        };
      });

    setPosts(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        loadPosts();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, () => {
        loadPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPosts]);

  const handleShowNew = () => {
    setNewCount(0);
    loadPosts();
  };

  return (
    <div className="pane">
      <div className="feedTopRow">
        <div className="feedSeg">
          <div className="segment">
            <button
              className={feedFilter === 'foryou' ? 'segOn' : ''}
              onClick={() => setFeedFilter('foryou')}
            >
              FOR YOU
            </button>
            <button
              className={feedFilter === 'following' ? 'segOn' : ''}
              onClick={() => setFeedFilter('following')}
            >
              FOLLOWING
            </button>
          </div>
        </div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {newCount > 0 && (
        <button className="newPostsBanner" onClick={handleShowNew}>
          {newCount} new {newCount === 1 ? 'post' : 'posts'} — tap to refresh
        </button>
      )}

      <PostComposer onPostCreated={loadPosts} />

      {loading && <LoadingBall text="Loading feed…" />}

      {!loading && posts.length === 0 && (
        <div className="empty">
          <p style={{ color: C.sand, fontSize: 14 }}>
            No posts yet. Be the first to share something!
          </p>
        </div>
      )}

      {posts.map((post) => (
        <FeedPost
          key={post.id}
          post={post}
          onOpenComments={setCommentsPostId}
          onOpenProfile={onOpenProfile}
          onRefresh={loadPosts}
        />
      ))}

      {commentsPostId && (
        <CommentsSheet
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
        />
      )}
    </div>
  );
}
