import { C } from '../lib/constants';
import { Tag, Capacity, AvatarStack } from './ui';

function isCourtOpen(court) {
  if (!court?.open_time || !court?.close_time) return null;
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes();
  const current = hours * 60 + mins;
  const [oh, om] = court.open_time.split(':').map(Number);
  const [ch, cm] = court.close_time.split(':').map(Number);
  const open = oh * 60 + (om || 0);
  const close = ch * 60 + (cm || 0);
  return current >= open && current < close;
}

export default function SessionCard({ session, court, onOpen, participants }) {
  const joined = participants?.filter((p) => p.status === 'confirmed').length || 0;
  const walkIns = session.walk_ins || 0;
  const full = session.cap != null && joined + walkIns >= session.cap;
  const typeTone = { OPEN_PLAY: 'open', TRAINING: 'training', RENTAL: 'rental' };
  const typeLabel = { OPEN_PLAY: 'OPEN PLAY', TRAINING: 'TRAINING', RENTAL: 'RENTAL' };
  const courtOpen = isCourtOpen(court);

  return (
    <button className="card" onClick={() => onOpen(session, court)}>
      <div className="cardTop">
        <div>
          <div className="rowTags">
            <Tag tone={typeTone[session.type]}>{typeLabel[session.type]}</Tag>
            {session.live && <Tag tone="live">LIVE</Tag>}
            {full && <Tag tone="full">FULL</Tag>}
            {courtOpen === true && <Tag tone="courtOpen">OPEN NOW</Tag>}
            {courtOpen === false && <Tag tone="courtClosed">CLOSED</Tag>}
          </div>
          <div className="cardTitle">{session.label}</div>
          <div className="cardSub">{court.name}</div>
          <div className="cardMeta">
            {session.schedule_text || (session.scheduled_at
              ? new Date(session.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })
              : '')}
            {court.town ? ` · ${court.town}` : ''}
          </div>
        </div>
        <div className="cardFee">
          <div className="feeAmt">{"₱"}{Number(session.fee).toLocaleString()}</div>
          <div className="feeUnit">per person</div>
        </div>
      </div>
      {session.cap != null && (
        <Capacity
          joined={joined}
          walkIns={walkIns}
          cap={session.cap}
          roster={participants
            ?.filter((p) => p.status === 'confirmed')
            .map((p) => ({ id: p.profile_id, name: p.profiles?.full_name, photo: p.profiles?.photo_url })) || []}
        />
      )}
    </button>
  );
}
