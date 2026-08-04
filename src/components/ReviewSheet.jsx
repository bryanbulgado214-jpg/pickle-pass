import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';

export default function ReviewSheet({ court, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await supabase.from('court_reviews').insert({
      court_id: court.id,
      profile_id: user.id,
      rating,
      review_text: text.trim() || null,
    });
    setSubmitting(false);
    onSubmitted?.();
    onClose();
  };

  return (
    <div className="sheetScrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <h3 className="h1" style={{ fontSize: 20 }}>Rate this court</h3>
        <p className="sub" style={{ marginTop: 4 }}>{court.name}</p>

        <div className="starRow">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              className={"starBtn" + (s <= rating ? " starOn" : "")}
              onClick={() => setRating(s)}
              aria-label={`${s} star${s > 1 ? 's' : ''}`}
            >
              {s <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>

        <textarea
          className="composerInput"
          placeholder="Share your experience (optional)"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ marginTop: 12 }}
        />

        <button
          className="cta"
          disabled={rating === 0 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
