import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Tag, Capacity, PersonAvatar } from './ui';
import PaySheet from './PaySheet';
import ReviewSheet from './ReviewSheet';
import BookingCalendar from './BookingCalendar';
import { CourtGalleryViewer } from './CourtGallery';
import ShareButton from './ShareButton';

export default function CourtDetail({ session, court, onBack }) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    loadParticipants();
    loadReviews();
  }, [session.id]);

  async function loadParticipants() {
    setLoading(true);
    const { data } = await supabase
      .from('session_participants')
      .select('*, profiles:profile_id(id, full_name, photo_url)')
      .eq('session_id', session.id)
      .order('joined_at', { ascending: true });
    setParticipants(data || []);

    const mine = (data || []).find((p) => p.profile_id === user?.id);
    setMyStatus(mine?.status || null);
    setLoading(false);
  }

  async function loadReviews() {
    const { data } = await supabase
      .from('court_reviews')
      .select('*, profiles:profile_id(full_name, photo_url)')
      .eq('court_id', court.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setReviews(data || []);
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const confirmed = participants.filter((p) => p.status === 'confirmed');
  const waitlisted = participants.filter((p) => p.status === 'waitlisted');
  const joined = confirmed.length;
  const walkIns = session.walk_ins || 0;
  const full = session.cap != null && joined + walkIns >= session.cap;

  const handleJoin = async () => {
    if (full) {
      const maxWaitPos = waitlisted.reduce((max, w) => Math.max(max, w.waitlist_position || 0), 0);
      await supabase.from('session_participants').insert({
        session_id: session.id,
        profile_id: user.id,
        status: 'waitlisted',
        waitlist_position: maxWaitPos + 1,
      });
    } else {
      await supabase.from('session_participants').insert({
        session_id: session.id,
        profile_id: user.id,
        status: 'confirmed',
      });
    }
    loadParticipants();
  };

  const handleCancel = async () => {
    await supabase
      .from('session_participants')
      .delete()
      .eq('session_id', session.id)
      .eq('profile_id', user.id);
    loadParticipants();
  };

  const handlePayConfirm = () => {
    setPaying(false);
    handleJoin();
  };

  const typeTone = { OPEN_PLAY: 'open', TRAINING: 'training', RENTAL: 'rental' };
  const typeLabel = { OPEN_PLAY: 'OPEN PLAY', TRAINING: 'TRAINING', RENTAL: 'RENTAL' };
  const fee = Number(session.fee);
  const serviceFee = Math.round(fee * 0.05 * 100) / 100;

  return (
    <div className="pane">
      <button className="back" onClick={onBack}>{"← Back"}</button>

      <div className="rowTags">
        <Tag tone={typeTone[session.type]}>{typeLabel[session.type]}</Tag>
        {session.live && <Tag tone="live">LIVE NOW</Tag>}
        {full && !myStatus && <Tag tone="full">FULL</Tag>}
      </div>

      <h2 className="h1" style={{ marginTop: 8 }}>{session.label}</h2>
      <div className="cardSub">{court.name} · {court.town}</div>
      <div className="cardMeta" style={{ marginTop: 4 }}>
        {session.schedule_text || (session.scheduled_at
          ? new Date(session.scheduled_at).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })
          : '')}
      </div>

      {court.verified && (
        <span className="verifiedTick">{"✓"} Verified Court</span>
      )}

      <CourtGalleryViewer courtId={court.id} />

      {session.cap != null && (
        <Capacity
          joined={joined}
          walkIns={walkIns}
          cap={session.cap}
          big
          roster={confirmed.map((p) => ({
            id: p.profile_id,
            name: p.profiles?.full_name,
            photo: p.profiles?.photo_url,
            isYou: p.profile_id === user?.id,
          }))}
        />
      )}

      <div style={{ marginTop: 16 }}>
        <div className="feeAmt" style={{ fontSize: 28 }}>
          {"₱"}{fee.toLocaleString()}
        </div>
        <div className="feeUnit">per person · via Pickle Pass</div>
      </div>

      {loading ? (
        <p style={{ color: C.sand, marginTop: 16, fontSize: 13 }}>Loading…</p>
      ) : myStatus === 'confirmed' ? (
        <>
          <div className="joinedBanner">
            {"✅"} You{"'"}re in! See you on the court.
          </div>
          <button className="cancelLink" onClick={handleCancel}>
            Cancel my spot
          </button>
        </>
      ) : myStatus === 'waitlisted' ? (
        <>
          <div className="waitlistBanner">
            {"⏳"} You{"'"}re on the waitlist
            {(() => {
              const mine = waitlisted.find((w) => w.profile_id === user?.id);
              return mine ? ` (#${mine.waitlist_position})` : '';
            })()}
          </div>
          <button className="cancelLink" onClick={handleCancel}>
            Leave waitlist
          </button>
        </>
      ) : full ? (
        <button className="cta" onClick={handleJoin}>
          Join Waitlist
        </button>
      ) : (
        <button className="cta" onClick={() => setPaying(true)}>
          Join & Pay {"₱"}{fee.toLocaleString()}
        </button>
      )}

      <div className="fine">
        5% service fee ({"₱"}{serviceFee.toFixed(2)}) applies. Full refund if you cancel before the session starts.
      </div>

      <ShareButton
        title={session.label}
        text={`Join ${session.label} at ${court.name}! ₱${fee} per person on Pickle Pass`}
        url={window.location.origin}
        label="Share Session"
      />

      {session.type === 'RENTAL' && (
        <BookingCalendar court={court} fee={fee} onBook={loadParticipants} />
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

      {paying && (
        <PaySheet
          fee={fee}
          serviceFee={serviceFee}
          label={session.label}
          onClose={() => setPaying(false)}
          onConfirm={handlePayConfirm}
        />
      )}

      {showReview && (
        <ReviewSheet
          court={court}
          onClose={() => setShowReview(false)}
          onSubmitted={loadReviews}
        />
      )}
    </div>
  );
}
