import { C } from '../lib/constants';
import { Tag, Capacity, AvatarStack } from './ui';

export default function SessionCard({ session, court, onOpen, participants }) {
  const joined = participants?.filter((p) => p.status === 'confirmed').length || 0;
  const walkIns = session.walk_ins || 0;
  const full = session.cap != null && joined + walkIns >= session.cap;
  const typeTone = { OPEN_PLAY: 'open', TRAINING: 'training', RENTAL: 'rental' };
  const typeLabel = { OPEN_PLAY: 'OPEN PLAY', TRAINING: 'TRAINING', RENTAL: 'RENTAL' };

  return (
    <button className="card" onClick={() => onOpen(session, court)}>
      <div className="cardTop">
        <div>
          <div className="rowTags">
            <Tag tone={typeTone[session.type]}>{typeLabel[session.type]}</Tag>
            {session.live && <Tag tone="live">LIVE</Tag>}
            {full && <Tag tone="full">FULL</Tag>}
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
