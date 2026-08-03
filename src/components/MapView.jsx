import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Ball } from './ui';
import { CourtsMap } from './TileMap';
import { haversineKm } from '../lib/utils';

export default function MapView({ onOpenCourt }) {
  const { user } = useAuth();
  const [courts, setCourts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <CourtsMap courts={courtsWithDist} userLocation={userLocation} onOpen={onOpenCourt} />
        </div>
      )}

      {loading && (
        <div className="empty">
          <p style={{ color: C.sand }}>Loading courts...</p>
        </div>
      )}

      {!loading && courts.length === 0 && (
        <div className="empty">
          <Ball size={30} />
          <div className="cardTitle" style={{ marginTop: 10 }}>No courts found</div>
        </div>
      )}

      {courtsWithDist.map((ct) => (
        <div key={ct.id} className="mapRow">
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
          <a
            className="dirBtn"
            href={`https://www.google.com/maps/dir/?api=1&destination=${ct.lat},${ct.lng}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Directions {"↗"}
          </a>
        </div>
      ))}
    </div>
  );
}
