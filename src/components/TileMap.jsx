import { useState, useEffect, useRef, useCallback } from 'react';

const TILE_SIZE = 256;

const lonLatToWorldPx = (lon, lat, zoom) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = (lon + 180) / 360 * scale;
  const sinLat = Math.sin(lat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
};

const worldPxToLonLat = (x, y, zoom) => {
  const scale = TILE_SIZE * 2 ** zoom;
  const lon = x / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lon, lat };
};

const fitZoom = (points, width, height, maxZoom = 16) => {
  if (points.length === 0) return 13;
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  points.forEach(({ lat, lng }) => {
    minLon = Math.min(minLon, lng); maxLon = Math.max(maxLon, lng);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  });
  for (let z = maxZoom; z >= 1; z--) {
    const a = lonLatToWorldPx(minLon, maxLat, z);
    const b = lonLatToWorldPx(maxLon, minLat, z);
    if (Math.abs(b.x - a.x) <= width * 0.82 && Math.abs(b.y - a.y) <= height * 0.82) return z;
  }
  return 1;
};

export const TileMap = ({ center: propCenter, zoom: propZoom, pins, pickable, onPick, className }) => {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 320, h: 260 });
  const [center, setCenter] = useState(propCenter);
  const [zoom, setZoom] = useState(propZoom);
  const dragRef = useRef(null);
  const lastPropCenter = useRef(propCenter);

  useEffect(() => {
    if (propCenter.lat !== lastPropCenter.current.lat || propCenter.lng !== lastPropCenter.current.lng) {
      setCenter(propCenter);
      lastPropCenter.current = propCenter;
    }
  }, [propCenter.lat, propCenter.lng]);

  useEffect(() => {
    setZoom(propZoom);
  }, [propZoom]);

  useEffect(() => {
    if (ref.current) setSize({ w: ref.current.clientWidth, h: ref.current.clientHeight });
  }, []);

  const centerPx = lonLatToWorldPx(center.lng, center.lat, zoom);
  const originX = centerPx.x - size.w / 2;
  const originY = centerPx.y - size.h / 2;
  const numTiles = 2 ** zoom;

  const tiles = [];
  for (let tx = Math.floor(originX / TILE_SIZE); tx <= Math.floor((originX + size.w) / TILE_SIZE); tx++) {
    for (let ty = Math.floor(originY / TILE_SIZE); ty <= Math.floor((originY + size.h) / TILE_SIZE); ty++) {
      if (ty < 0 || ty >= numTiles) continue;
      const wrapped = ((tx % numTiles) + numTiles) % numTiles;
      tiles.push({ key: `${zoom}-${wrapped}-${ty}`, left: tx * TILE_SIZE - originX, top: ty * TILE_SIZE - originY, x: wrapped, y: ty });
    }
  }

  const handlePointerDown = useCallback((e) => {
    if (e.button && e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, center: { ...center }, moved: false };
    ref.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [center]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    const startPx = lonLatToWorldPx(dragRef.current.center.lng, dragRef.current.center.lat, zoom);
    const newPos = worldPxToLonLat(startPx.x - dx, startPx.y - dy, zoom);
    setCenter({ lat: Math.max(-85, Math.min(85, newPos.lat)), lng: newPos.lon });
  }, [zoom]);

  const handlePointerUp = useCallback((e) => {
    const wasDrag = dragRef.current?.moved;
    dragRef.current = null;
    if (!wasDrag && pickable && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const cPx = lonLatToWorldPx(center.lng, center.lat, zoom);
      const oX = cPx.x - size.w / 2;
      const oY = cPx.y - size.h / 2;
      const { lon, lat } = worldPxToLonLat(e.clientX - rect.left + oX, e.clientY - rect.top + oY, zoom);
      onPick?.(lat, lon);
    }
  }, [pickable, onPick, center, zoom, size]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.max(2, Math.min(18, z + (e.deltaY < 0 ? 1 : -1))));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div
      ref={ref}
      className={"tileMap" + (className ? " " + className : "")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { dragRef.current = null; }}
      style={{ touchAction: 'none' }}
    >
      {tiles.map((t) => (
        <img key={t.key} src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`} alt="" draggable={false}
          className="tileImg" style={{ left: t.left, top: t.top }} />
      ))}
      {pins.map((p, i) => {
        const px = lonLatToWorldPx(p.lng, p.lat, zoom);
        return (
          <div
            key={p.key ?? i}
            className={"tilePin" + (p.className ? " " + p.className : "")}
            style={{ left: px.x - originX, top: px.y - originY }}
            title={p.label}
            onClick={(e) => { if (p.onClick) { e.stopPropagation(); p.onClick(); } }}
          />
        );
      })}
      <div className="tileAttribution">© OpenStreetMap</div>
    </div>
  );
};

export const CourtsMap = ({ courts, userLocation, selectedId, onSelect, onDeselect }) => {
  const selected = selectedId ? courts.find((c) => c.id === selectedId) : null;
  const center = selected
    ? { lat: selected.lat, lng: selected.lng }
    : userLocation || (courts.length
      ? { lat: courts.reduce((s, c) => s + c.lat, 0) / courts.length, lng: courts.reduce((s, c) => s + c.lng, 0) / courts.length }
      : { lat: 10, lng: 20 });
  const points = courts.map((c) => ({ lat: c.lat, lng: c.lng }));
  if (userLocation) points.push(userLocation);
  const zoom = selected ? 16 : fitZoom(points, 320, 260);
  const pins = courts.map((ct) => ({
    lat: ct.lat, lng: ct.lng,
    className: "court" + (selectedId === ct.id ? " selected" : ""),
    label: ct.name, key: ct.id,
    onClick: () => onSelect(ct),
  }));
  if (userLocation) pins.push({ lat: userLocation.lat, lng: userLocation.lng, className: "you", label: "You are here", key: "you" });
  return <TileMap center={center} zoom={zoom} pins={pins} pickable onPick={() => { if (selectedId) onDeselect(); }} />;
};

export const LocationPicker = ({ lat, lng, onChange }) => {
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => onChange(pos.coords.latitude, pos.coords.longitude));
  };
  return (
    <div>
      <TileMap center={{ lat, lng }} zoom={16} pins={[{ lat, lng, className: "you big" }]} pickable onPick={onChange} className="locationPickerMap" />
      <div className="pickerRow">
        <span className="fine" style={{ margin: 0 }}>{"\u{1F4CD}"} {lat.toFixed(5)}, {lng.toFixed(5)}</span>
        <button type="button" className="linkBtn small" onClick={useMyLocation}>Use my current location</button>
      </div>
      <div className="fine">Tap anywhere on the map to place the pin exactly on your facility.</div>
    </div>
  );
};
