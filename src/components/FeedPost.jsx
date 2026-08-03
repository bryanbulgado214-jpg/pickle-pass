import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C, REACTIONS } from '../lib/constants';
import { totalReactions, renderWithMentions } from '../lib/utils';
import { PersonAvatar, Tag } from './ui';

export default function FeedPost({ post, onOpenComments, onOpenProfile, onRefresh }) {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);

  const author = post.profiles;
  const reactionCounts = post.reaction_counts || {};
  const myReaction = post.my_reaction;
  const total = totalReactions(reactionCounts);
  const commentCount = post.comment_count || 0;

  const handleReaction = async (reactionType) => {
    setShowPicker(false);
    if (!user) return;
    if (myReaction === reactionType) {
      await supabase
        .from('reactions')
        .delete()
        .eq('post_id', post.id)
        .eq('profile_id', user.id);
    } else {
      await supabase
        .from('reactions')
        .upsert(
          { post_id: post.id, profile_id: user.id, reaction_type: reactionType },
          { onConflict: 'post_id,profile_id' }
        );
    }
    onRefresh?.();
  };

  const kindLabel = {
    checkin: null,
    milestone: null,
    listing: 'New Listing',
    photo: null,
    media: null,
    tournament: 'Tournament',
  };

  const kindTone = {
    listing: 'open',
    tournament: 'tourney',
  };

  return (
    <div className={"feedPost" + (post.status === 'pending' ? " pendingPost" : "")}>
      {post.status === 'pending' && (
        <div className="pendingTag">{"\u{23F3}"} Pending review</div>
      )}
      <div className="feedHead">
        <button className="feedHeadBtn" onClick={() => author && onOpenProfile?.(author.id)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {post.kind === 'listing' || post.kind === 'tournament' ? (
              <div className="feedAvatar courtAvatar">
                <PersonAvatar name={post.court?.name || 'Court'} size={36} />
              </div>
            ) : (
              <div className="feedAvatar">
                <PersonAvatar
                  name={author?.full_name}
                  photo={author?.photo_url}
                  size={36}
                />
              </div>
            )}
            <div>
              <div className="feedName">
                {post.kind === 'listing' || post.kind === 'tournament'
                  ? post.court?.name || 'Court'
                  : author?.full_name || 'Unknown'}
              </div>
              <div className="feedTime">
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="feedBody">
        {kindLabel[post.kind] && (
          <div className="rowTags" style={{ marginBottom: 6 }}>
            <Tag tone={kindTone[post.kind]}>{kindLabel[post.kind]}</Tag>
          </div>
        )}
        <div className="feedText">{renderWithMentions(post.text_content)}</div>
        {post.media_url && (
          <div className="feedMedia">
            {post.media_type === 'video' ? (
              <video src={post.media_url} className="feedMediaEl" controls />
            ) : (
              <img src={post.media_url} alt="" className="feedMediaEl zoomable" />
            )}
          </div>
        )}
      </div>

      <div className="feedActions">
        <div className="reactionWrap">
          <button
            className={"kudosBtn" + (myReaction ? " given" : "")}
            onClick={() => setShowPicker(!showPicker)}
          >
            {myReaction
              ? REACTIONS.find((r) => r.id === myReaction)?.emoji + ' '
              : ''}
            {total > 0 ? total : 'React'}
          </button>
          {showPicker && (
            <div className="reactionPicker">
              {REACTIONS.map((r) => (
                <button
                  key={r.id}
                  className={"reactionOption" + (myReaction === r.id ? " active" : "")}
                  title={r.label}
                  onClick={() => handleReaction(r.id)}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="commentBtn" onClick={() => onOpenComments?.(post.id)}>
          {"\u{1F4AC}"} {commentCount > 0 ? commentCount : 'Comment'}
        </button>
      </div>
    </div>
  );
}
