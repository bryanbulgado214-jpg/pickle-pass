import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Tag, Ball, Capacity, PersonAvatar } from './ui';
import { LocationPicker } from './TileMap';

function CourtSwitcher({ myCourts, activeId, onSwitch }) {
  if (myCourts.length < 2) return null;
  return (
    <div className="courtSwitcher">
      {myCourts.map((c) => (
        <button key={c.id} className={"courtChip" + (c.id === activeId ? " on" : "")} onClick={() => onSwitch(c.id)}>
          {c.verified ? "✓" : "○"} {c.name}
        </button>
      ))}
    </div>
  );
}

export function OwnerVerifyScreen({ court, myCourts, onSwitchCourt, onSubmitted, userLocation }) {
  const [name, setName] = useState(court?.name || '');
  const [town, setTown] = useState(court?.town || '');
  const [uploaded, setUploaded] = useState(false);
  const [pin, setPin] = useState({
    lat: court?.lat || userLocation?.lat || 9.9312,
    lng: court?.lng || userLocation?.lng || 123.3054,
  });

  if (court?.owner_status === 'pending') {
    return (
      <div className="pane">
        <CourtSwitcher myCourts={myCourts} activeId={court.id} onSwitch={onSwitchCourt} />
        <div className="paneHead">
          <div className="h1">VERIFY YOUR COURT</div>
          <div className="sub">Required before listings go live</div>
        </div>
        <div className="verifyPending">
          <div className="cardTitle">{"⏳"} {court.name} {"—"} verification submitted</div>
          <div className="sub" style={{ marginTop: 6 }}>A Pickle Pass admin is reviewing your documents.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pane">
      <CourtSwitcher myCourts={myCourts} activeId={court?.id} onSwitch={onSwitchCourt} />
      <div className="paneHead">
        <div className="h1">VERIFY YOUR COURT</div>
        <div className="sub">Required once per court, before listings go live</div>
      </div>
      <div className="formRow"><label>Court name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="formRow"><label>Town</label><input className="input" value={town} onChange={(e) => setTown(e.target.value)} /></div>
      <div className="formRow">
        <label>Exact location</label>
        <LocationPicker lat={pin.lat} lng={pin.lng} onChange={(lat, lng) => setPin({ lat, lng })} />
      </div>
      <div className="formRow"><label>DTI / Business Permit No.</label><input className="input" placeholder="e.g. 2026-0001234" /></div>
      <div className="formRow"><label>Contact number</label><input className="input" placeholder="09XX XXX XXXX" /></div>
      <div className="formRow">
        <label>Proof of ownership or lease</label>
        <button className="uploadBtn" onClick={() => setUploaded(true)}>
          {uploaded ? "✓ Document uploaded" : "+ Upload document"}
        </button>
      </div>
      <button
        className="cta"
        disabled={!uploaded || !name.trim() || !town.trim()}
        onClick={() => onSubmitted?.(court?.id, { name: name.trim(), town: town.trim(), lat: pin.lat, lng: pin.lng })}
      >
        Submit for verification
      </button>
      <div className="fine">Every court is manually reviewed to keep the marketplace trustworthy.</div>
    </div>
  );
}

export function OwnerHome({ court, myCourts, activeOwnerCourtId, onSwitchCourt }) {
  return (
    <div className="pane">
      <CourtSwitcher myCourts={myCourts} activeId={activeOwnerCourtId} onSwitch={onSwitchCourt} />
      <div className="paneHead">
        <div className="h1">TODAY AT {(court?.name || '').toUpperCase()}</div>
        <div className="sub">Owner console {"·"} {court?.town} {"·"} <span className="verifiedTick">{"✓"} Verified</span></div>
      </div>
      <div className="empty">
        <Ball size={30} />
        <div className="cardTitle" style={{ marginTop: 10 }}>No listings yet</div>
        <div className="sub">Head to "New Listing" to post your first session.</div>
      </div>
    </div>
  );
}

export function OwnerNew({ courtId, onPost }) {
  const [type, setType] = useState('OPEN_PLAY');
  const [title, setTitle] = useState('Sunset Open Play');
  const [cap, setCap] = useState(20);
  const [fee, setFee] = useState(150);
  const [schedule, setSchedule] = useState('Today 4:00-7:00 PM');
  const [posted, setPosted] = useState(false);

  const typeLabels = { OPEN_PLAY: 'OPEN PLAY', TRAINING: 'TRAINING', RENTAL: 'RENTAL' };
  const feeLabel = type === 'RENTAL' ? 'Rate (₱/hour)' : 'Entrance fee (₱)';

  async function handleSubmit() {
    await supabase.from('sessions').insert({
      court_id: courtId,
      type,
      label: title,
      fee,
      cap: type === 'RENTAL' ? null : cap,
      schedule_text: schedule,
    });
    setPosted(true);
    onPost?.();
  }

  return (
    <div className="pane">
      <div className="paneHead">
        <div className="h1">POST A LISTING</div>
        <div className="sub">Players nearby get notified instantly</div>
      </div>

      <div className="h2">LISTING TYPE</div>
      <div className="segment">
        {Object.entries(typeLabels).map(([id, label]) => (
          <button key={id} className={type === id ? 'segOn' : ''} onClick={() => setType(id)}>{label}</button>
        ))}
      </div>

      <div className="formRow">
        <label>Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="formSplit">
        <div className="formRow">
          <label>{feeLabel}</label>
          <input className="input" type="number" value={fee} onChange={(e) => setFee(+e.target.value)} />
        </div>
        {type !== 'RENTAL' && (
          <div className="formRow">
            <label>Max players</label>
            <input className="input" type="number" value={cap} onChange={(e) => setCap(+e.target.value)} />
          </div>
        )}
      </div>
      <div className="formRow">
        <label>Schedule</label>
        <input className="input" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
      </div>

      {posted ? (
        <div className="joinedBanner">{"✓"} Posted! Your listing is live.</div>
      ) : (
        <button className="cta" onClick={handleSubmit}>Post listing</button>
      )}
    </div>
  );
}

export function OwnerEarnings() {
  return (
    <div className="pane">
      <div className="paneHead">
        <div className="h1">PAYOUTS</div>
        <div className="sub">Lump sum, next day after each session</div>
      </div>
      <div className="empty">
        <Ball size={30} />
        <div className="cardTitle" style={{ marginTop: 10 }}>No payouts yet</div>
        <div className="sub">Earnings from completed sessions will appear here.</div>
      </div>
      <div className="fine">Players pay the entrance fee + a small app service fee. You always receive 100% of your posted rate.</div>
    </div>
  );
}
