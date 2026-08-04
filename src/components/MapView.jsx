import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Ball, LoadingBall } from './ui';
import { CourtsMap } from './TileMap';
import { haversineKm } from '../lib/utils';

export default function MapView({ onOpenCourt }) {
  const { user } = useAuth();
  const [courts, setCourts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    loadCourts();
  }, []);

  async function loadCourts() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('courts')
      .select('*')
      .order('name');

    if (err) { setError(err.message); setLoading(false); return; }

    setCourts(data || []);
    setLoading(false);
  }

  const courtsWithDist = courts.map((c) => ({
    ...c,
    km: userLocation ? haversineKm(userLocation.lat, userLocation.lng, c.lat, c.lng) : null,
  }));

  return (
    <div className="pane">
      <div className="paneHead">
        <div className="h1">COURTS NEAR YOU</div>
        <div className="sub">
          {userLocation ? 'GPS on · distances from your real location' : 'Enable location for distances'}
        </div>
      </div>

      {error && <div className="errorBanner">{error}</div>}

      {!loading && courts.length > 0 && (
        <div className="mapWrap">
          <CourtsMap
            courts={courtsWithDist}
            userLocation={userLocation}
            selectedId={selectedId}
            onSelect={(ct) => setSelectedId(ct.id)}
            onDeselect={() => setSelectedId(null)}
          />
        </div>
      )}

      {selectedId && (
        <button className="ghostBtn" style={{ marginBottom: 8, width: '100%' }} onClick={() => setSelectedId(null)}>
          Show All Courts
        </button>
      )}

      {loading && <LoadingBall text="Loading courts…" />}

      {!loading && courts.length === 0 && (
        <div className="empty">
          <Ball size={30} />
          <div className="cardTitle" style={{ marginTop: 10 }}>No courts found</div>
        </div>
      )}

      {courtsWithDist.filter((ct) => !selectedId || ct.id === selectedId).map((ct) => (
        <button key={ct.id} className="mapRow" onClick={() => onOpenCourt(ct)}>
          <div className="mapRowL">
            <Ball size={14} />
            <div>
              <div className="mapName">
                {ct.name}
                {ct.verified && <span className="verifiedTick" title="Verified court">{"✓"}</span>}
              </div>
              <div className="mapTown">
                {ct.town}
                {ct.km != null ? ` · ${ct.km.toFixed(1)} km` : ''}
                {ct.rating ? ` · ★ ${ct.rating}` : ''}
              </div>
            </div>
          </div>
          <span className="profileLinkVal">{"→"}</span>
        </button>
      ))}
    </div>
  );
}
