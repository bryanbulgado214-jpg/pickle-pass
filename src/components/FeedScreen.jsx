import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import FeedPost from './FeedPost';
import PostComposer from './PostComposer';
import CommentsSheet from './CommentsSheet';

export default function FeedScreen({ onOpenProfile }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [feedFilter, setFeedFilter] = useState('foryou');

  const loadPosts = useCallback(async () => {
    setLoading(true);

    const { data: rawPosts } = await supabase
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

      <PostComposer onPostCreated={loadPosts} />

      {loading && (
        <div className="empty">
          <p style={{ color: C.sand }}>Loading feed…</p>
        </div>
      )}

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
