import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';

function compressImage(file, maxSize = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    if (file.type.startsWith('video')) { resolve(file); return; }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize && file.size < 500_000) {
        resolve(file);
        return;
      }
      if (width > height) {
        if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
      } else {
        if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function PostComposer({ onPostCreated }) {
  const { user, profile } = useAuth();
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

    const optimisticPreview = mediaPreview;
    const optimisticCaption = caption.trim();
    setCaption('');
    setMedia(null);
    setMediaPreview(null);
    setJustPosted(true);
    setTimeout(() => setJustPosted(false), 3000);

    onPostCreated?.({
      id: 'optimistic-' + Date.now(),
      profile_id: user.id,
      profiles: { id: user.id, full_name: profile?.full_name, photo_url: profile?.photo_url },
      kind: optimisticPreview ? 'media' : 'checkin',
      text_content: optimisticCaption || null,
      media_url: optimisticPreview || null,
      media_type: optimisticPreview ? 'image' : null,
      status: 'approved',
      created_at: new Date().toISOString(),
      reactions: [],
      comments: [],
      reaction_counts: {},
      my_reaction: null,
      comment_count: 0,
      _optimistic: true,
    });

    let mediaUrl = null;
    let mediaType = null;

    if (media) {
      mediaType = media.type.startsWith('video') ? 'video' : 'image';
      const compressed = await compressImage(media);
      const ext = compressed.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('post-media')
        .upload(path, compressed);
      if (uploadErr) {
        setError('Photo upload failed — storage may not be configured yet.');
        setPosting(false);
        onPostCreated?.();
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
      text_content: optimisticCaption || null,
      media_url: mediaUrl,
      media_type: mediaType,
      status: 'approved',
    });

    setPosting(false);
    if (postErr) {
      setError(postErr.message);
    }
    onPostCreated?.();
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
