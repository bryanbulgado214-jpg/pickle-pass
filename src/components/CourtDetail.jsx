import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Tag, Capacity, PersonAvatar } from './ui';
import PaySheet from './PaySheet';

export default function CourtDetail({ session, court, onBack }) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParticipants();
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

      {paying && (
        <PaySheet
          fee={fee}
          serviceFee={serviceFee}
          label={session.label}
          onClose={() => setPaying(false)}
          onConfirm={handlePayConfirm}
        />
      )}
    </div>
  );
}
