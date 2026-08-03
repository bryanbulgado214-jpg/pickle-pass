import { C, FONT_DISPLAY } from '../lib/constants';
import { colorForName } from '../lib/utils';

export const Ball = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill={C.ball} />
    <circle cx="8" cy="8" r="1.6" fill={C.ink} opacity="0.85" />
    <circle cx="15" cy="7" r="1.6" fill={C.ink} opacity="0.85" />
    <circle cx="17" cy="13" r="1.6" fill={C.ink} opacity="0.85" />
    <circle cx="11" cy="14" r="1.6" fill={C.ink} opacity="0.85" />
    <circle cx="7" cy="16" r="1.6" fill={C.ink} opacity="0.85" />
    <circle cx="13" cy="19" r="1.6" fill={C.ink} opacity="0.85" />
  </svg>
);

export const Tag = ({ children, tone }) => {
  const tones = {
    open: { bg: "rgba(215,240,0,0.14)", fg: C.ball },
    training: { bg: "rgba(57,217,138,0.14)", fg: C.ok },
    rental: { bg: "rgba(255,255,255,0.10)", fg: C.line },
    live: { bg: "rgba(255,107,87,0.16)", fg: C.coral },
    full: { bg: "rgba(255,107,87,0.16)", fg: C.coral },
    tourney: { bg: "rgba(212,175,55,0.18)", fg: "#D4AF37" },
    waitlist: { bg: "rgba(215,240,0,0.14)", fg: C.ball },
  };
  const t = tones[tone] || tones.rental;
  return <span className="tag" style={{ background: t.bg, color: t.fg }}>{children}</span>;
};

export const PersonAvatar = ({ name, photo, size = 44 }) =>
  photo ? (
    <img
      src={photo}
      alt=""
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
    />
  ) : (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: colorForName(name),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: size * 0.42, flexShrink: 0,
      }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );

export const PhotoLightbox = ({ url, onClose }) => (
  <div className="lightboxScrim" onClick={onClose}>
    <button className="lightboxClose" onClick={onClose} aria-label="Close">{"✕"}</button>
    <img src={url} alt="" className="lightboxImg" onClick={(e) => e.stopPropagation()} />
  </div>
);

export const RosterChip = ({ id, name, photo, isYou, onOpenProfile }) => (
  <button className={"rosterChip" + (isYou ? " you" : "")} onClick={() => onOpenProfile?.(id, isYou)}>
    <div className="rosterAvatar"><PersonAvatar name={name} photo={photo} size={44} /></div>
    <div className="rosterName">{isYou ? "You" : (name || "").split(" ")[0]}</div>
  </button>
);

export const AvatarStack = ({ roster = [], totalJoined = 0 }) => {
  if (!roster.length) return null;
  const shown = roster.slice(0, 5);
  const extra = Math.max(0, totalJoined - shown.length);
  return (
    <div className="avatarStack">
      {shown.map((p, i) => (
        <div key={p.id} className="avatarStackItem" style={{ zIndex: shown.length - i }}>
          <PersonAvatar name={p.full_name || p.name} photo={p.photo_url || p.photo} size={26} />
        </div>
      ))}
      {extra > 0 && <div className="avatarStackItem more">+{extra}</div>}
    </div>
  );
};

export const Capacity = ({ joined, walkIns, cap, big, roster, onOpenProfile }) => {
  if (cap == null) return null;
  const total = Math.min(joined + walkIns, cap);
  const pct = (total / cap) * 100;
  const full = total >= cap;
  const hasRoster = roster && roster.length > 0;
  return (
    <div className={big ? "cap capBig" : "cap"}>
      <div className="capScore" style={{ color: full ? C.coral : C.ball }}>
        {total}<span className="capSlash">/</span>{cap}
      </div>
      <div className="capTrack" role="img" aria-label={`${total} of ${cap} spots taken`}>
        <div className="capFill" style={{ width: pct + "%", background: full ? C.coral : C.ball }} />
        <div className="capKitchen" />
      </div>
      <div className="capNote">
        {full ? "Session full — join waitlist" : `${cap - total} spots left`}
        {walkIns > 0 && <span> · incl. {walkIns} walk-in{walkIns > 1 ? "s" : ""}</span>}
      </div>
      {!big && hasRoster && <AvatarStack roster={roster} totalJoined={joined} />}
      {big && hasRoster && (
        <div className="rosterRow">
          {roster.slice(0, 8).map((p) => (
            <RosterChip key={p.id} id={p.id} name={p.full_name || p.name} photo={p.photo_url || p.photo} isYou={p.isYou} onOpenProfile={onOpenProfile} />
          ))}
          {joined - Math.min(roster.length, 8) > 0 && (
            <div className="rosterChip">
              <div className="moreCircle">+{joined - Math.min(roster.length, 8)}</div>
              <div className="rosterName">more</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SearchFilterBar = ({ query, onQuery, typeFilter, onTypeFilter, sortBy, onSortBy }) => (
  <div className="searchBar">
    <input
      className="searchInput"
      placeholder="🔍 Search courts, towns, sessions…"
      value={query}
      onChange={(e) => onQuery(e.target.value)}
    />
    <div className="filterRow">
      <div className="filterChips">
        {[["all", "All"], ["OPEN_PLAY", "Open Play"], ["TRAINING", "Training"], ["RENTAL", "Rental"]].map(([id, label]) => (
          <button key={id} className={typeFilter === id ? "chipOn" : ""} onClick={() => onTypeFilter(id)}>{label}</button>
        ))}
      </div>
      <select className="sortSelect" value={sortBy} onChange={(e) => onSortBy(e.target.value)} aria-label="Sort sessions">
        <option value="distance">Nearest</option>
        <option value="price">Cheapest</option>
        <option value="soonest">Soonest</option>
      </select>
    </div>
  </div>
);

export const NotificationBell = ({ count, onClick }) => (
  <button className="bellBtn" onClick={onClick} aria-label="Notifications">
    {"\u{1F514}"}
    {count > 0 && <span className="bellBadge">{count}</span>}
  </button>
);

export const CourtBackdrop = () => (
  <svg className="courtBackdrop" viewBox="0 0 300 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#bfe6ef" />
        <stop offset="100%" stopColor="#8fd0c9" />
      </linearGradient>
      <linearGradient id="courtGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1a8f68" />
        <stop offset="100%" stopColor="#0e6a4d" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="300" height="95" fill="url(#skyGrad)" />
    <g opacity="0.35" stroke="#0A2E3C" strokeWidth="2">
      {Array.from({ length: 20 }).map((_, i) => (
        <path key={i} d={`M${i * 16},95 L${i * 16 + 8},80 L${i * 16 + 16},95`} fill="none" />
      ))}
    </g>
    <rect x="0" y="95" width="300" height="125" fill="url(#courtGrad)" />
    <rect x="20" y="108" width="260" height="98" fill="none" stroke="#F2F6F1" strokeWidth="2.5" opacity="0.8" />
    <line x1="20" y1="157" x2="280" y2="157" stroke="#F2F6F1" strokeWidth="2" opacity="0.6" />
    <rect x="70" y="132" width="160" height="50" fill="none" stroke="#F2F6F1" strokeWidth="2" opacity="0.55" />
    <line x1="150" y1="108" x2="150" y2="132" stroke="#F2F6F1" strokeWidth="2" opacity="0.55" />
    <line x1="150" y1="182" x2="150" y2="206" stroke="#F2F6F1" strokeWidth="2" opacity="0.55" />
  </svg>
);
