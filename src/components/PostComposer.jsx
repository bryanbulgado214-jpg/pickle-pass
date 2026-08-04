import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';

export default function PostComposer({ onPostCreated }) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [justPosted, setJustPosted] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    if (!caption.trim() && !media) return;
    setPosting(true);
    setError(null);

    let mediaUrl = null;
    let mediaType = null;

    if (media) {
      mediaType = media.type.startsWith('video') ? 'video' : 'image';
      const ext = media.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('post-media')
        .upload(path, media);
      if (uploadErr) {
        setError('Photo upload failed — storage may not be configured yet.');
        setPosting(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('post-media')
        .getPublicUrl(path);
      mediaUrl = urlData.publicUrl;
    }

    const { error: postErr } = await supabase.from('posts').insert({
      profile_id: user.id,
      kind: media ? 'media' : 'checkin',
      text_content: caption.trim() || null,
      media_url: mediaUrl,
      media_type: mediaType,
      status: 'approved',
    });

    setPosting(false);
    if (postErr) {
      setError(postErr.message);
      return;
    }
    if (!postErr) {
      setCaption('');
      setMedia(null);
      setMediaPreview(null);
      setJustPosted(true);
      setTimeout(() => setJustPosted(false), 3000);
      onPostCreated?.();
    }
  };

  return (
    <div className="composer">
      <textarea
        className="composerInput"
        placeholder="Share something with the community…"
        rows={2}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      {mediaPreview && (
        <div className="composerPreview">
          {media?.type.startsWith('video') ? (
            <video src={mediaPreview} style={{ width: '100%', borderRadius: 12 }} controls />
          ) : (
            <img src={mediaPreview} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'cover' }} />
          )}
          <button className="composerRemove" onClick={() => { setMedia(null); setMediaPreview(null); }}>
            Remove
          </button>
        </div>
      )}
      <div className="composerRow">
        <label className="composerAttachBtn">
          {"\u{1F4F7}"} Photo / Video
          <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
        </label>
        <button
          className="composerPostBtn"
          disabled={posting || (!caption.trim() && !media)}
          onClick={handlePost}
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
      {error && <div className="errorBanner" style={{ margin: '8px 0 0' }}>{error}</div>}
      {justPosted && (
        <div className="composerNote">{"✅"} Posted!</div>
      )}
    </div>
  );
}
