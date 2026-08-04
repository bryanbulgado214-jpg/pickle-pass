import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { C } from '../lib/constants';

export function CourtGalleryUpload({ courtId }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    loadPhotos();
  }, [courtId]);

  async function loadPhotos() {
    const { data } = await supabase
      .from('court_photos')
      .select('*')
      .eq('court_id', courtId)
      .order('position', { ascending: true });
    setPhotos(data || []);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${courtId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('court-photos')
      .upload(path, file, { upsert: false });
    if (upErr) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('court-photos').getPublicUrl(path);
    const nextPos = photos.length;
    await supabase.from('court_photos').insert({
      court_id: courtId,
      photo_url: urlData.publicUrl,
      position: nextPos,
    });
    setUploading(false);
    loadPhotos();
  }

  async function removePhoto(id) {
    await supabase.from('court_photos').delete().eq('id', id);
    loadPhotos();
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div className="h2">COURT PHOTOS</div>
      <div className="galleryGrid">
        {photos.map((p) => (
          <div key={p.id} className="galleryThumb">
            <img src={p.photo_url} alt="" />
            <button className="galleryRemove" onClick={() => removePhoto(p.id)}>{"×"}</button>
          </div>
        ))}
        <button
          className="galleryAdd"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '...' : '+ Add'}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        </button>
      </div>
    </div>
  );
}

export function CourtGalleryViewer({ courtId }) {
  const [photos, setPhotos] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    loadPhotos();
  }, [courtId]);

  async function loadPhotos() {
    const { data } = await supabase
      .from('court_photos')
      .select('*')
      .eq('court_id', courtId)
      .order('position', { ascending: true });
    setPhotos(data || []);
  }

  if (photos.length === 0) return null;

  return (
    <div className="galleryViewer">
      <div className="gallerySlide">
        <img src={photos[activeIdx]?.photo_url} alt="" className="galleryMainImg" />
        {photos.length > 1 && (
          <>
            <button
              className="galleryArrow galleryPrev"
              onClick={() => setActiveIdx((i) => (i - 1 + photos.length) % photos.length)}
            >{"‹"}</button>
            <button
              className="galleryArrow galleryNext"
              onClick={() => setActiveIdx((i) => (i + 1) % photos.length)}
            >{"›"}</button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="galleryDots">
          {photos.map((_, i) => (
            <button
              key={i}
              className={`galleryDot ${i === activeIdx ? 'active' : ''}`}
              onClick={() => setActiveIdx(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
