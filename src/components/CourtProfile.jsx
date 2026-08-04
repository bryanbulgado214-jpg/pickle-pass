import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { C } from '../lib/constants';
import { Ball, LoadingBall, Tag } from './ui';
import { CourtGalleryViewer } from './CourtGallery';
import ReviewSheet from './ReviewSheet';
import ShareButton from './ShareButton';

export default function CourtProfile({ court, onBack, onOpenSession }) {
  const [reviews, setReviews] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    loadData();
  }, [court.id]);

  async function loadData() {
    setLoading(true);
    const [reviewResult, sessionResult] = await Promise.all([
      supabase
        .from('court_reviews')
        .select('*, profiles:profile_id(full_name, photo_url)')
        .eq('court_id', court.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('sessions')
        .select('*')
        .eq('court_id', court.id)
        .order('scheduled_at', { ascending: true })
        .limit(5),
    ]);
    setReviews(reviewResult.data || []);
    setSessions(sessionResult.data || []);
    setLoading(false);
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const typeLabel = { OPEN_PLAY: 'Open Play', TRAINING: 'Training', RENTAL: 'Rental' };
  const typeTone = { OPEN_PLAY: 'open', TRAINING: 'training', RENTAL: 'rental' };

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"← Back"}</button>

      <div className="courtProfileHero">
        <Ball size={40} />
        <h2 className="h1" style={{ marginTop: 10 }}>{court.name}</h2>
        <div className="cardSub">
          {court.town}
          {court.verified && <span className="verifiedTick"> {"✓"} Verified</span>}
        </div>
        {avgRating && (
          <div className="courtRatingBig">{"★"} {avgRating} <span className="sub">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span></div>
        )}
      </div>

      <CourtGalleryViewer courtId={court.id} />

      {court.description && (
        <div className="courtDesc">{court.description}</div>
      )}

      <div className="detailActions" style={{ marginTop: 12 }}>
        <ShareButton
          title={court.name}
          text={`Check out ${court.name} on Pickle Pass!`}
          url={window.location.origin}
          label="Share Court"
        />
        {court.lat && court.lng && (
          <a
            className="directionsBtn"
            href={`https://www.google.com/maps/dir/?api=1&destination=${court.lat},${court.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {"\u{1F4CD}"} Get Directions
          </a>
        )}
      </div>

      {loading && <LoadingBall text="Loading details..." />}

      {!loading && sessions.length > 0 && (
        <>
          <div className="h2" style={{ marginTop: 16 }}>ACTIVE LISTINGS</div>
          {sessions.map((s) => (
            <button
              key={s.id}
              className="courtSessionRow"
              onClick={() => onOpenSession?.(s, court)}
            >
              <div>
                <div className="feedName">{s.label}</div>
                <div className="cardMeta">
                  {s.scheduled_at
                    ? new Date(s.scheduled_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })
                    : 'TBA'}
                  {s.fee > 0 && ` · ₱${Number(s.fee).toLocaleString()}`}
                </div>
              </div>
              <div className="rowTags">
                <Tag tone={typeTone[s.type]}>{typeLabel[s.type] || s.type}</Tag>
              </div>
            </button>
          ))}
        </>
      )}

      {!loading && sessions.length === 0 && (
        <div className="empty" style={{ marginTop: 16 }}>
          <div className="sub">No active listings right now</div>
        </div>
      )}

      <div className="reviewSection">
        <div className="reviewHeader">
          <div className="h2">REVIEWS {avgRating && <span className="avgBadge">{"★"} {avgRating}</span>}</div>
          <button className="linkBtn small" onClick={() => setShowReview(true)}>Write a review</button>
        </div>
        {reviews.length === 0 && (
          <div className="sub" style={{ fontSize: 12.5 }}>No reviews yet. Be the first!</div>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="reviewCard">
            <div className="reviewTop">
              <span className="reviewAuthor">{r.profiles?.full_name || 'Player'}</span>
              <span className="reviewStars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
            </div>
            {r.review_text && <p className="reviewText">{r.review_text}</p>}
            <div className="reviewTime">
              {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>

      {showReview && (
        <ReviewSheet
          court={court}
          onClose={() => setShowReview(false)}
          onSubmitted={() => { setShowReview(false); loadData(); }}
        />
      )}
    </div>
  );
}
