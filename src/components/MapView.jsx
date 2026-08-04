import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { Ball, LoadingBall } from './ui';
import { CourtsMap } from './TileMap';
import { haversineKm } from '../lib/utils';

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('pp_fav_courts') || '[]'); } catch { return []; }
}

export default function MapView({ onOpenCourt }) {
  const { user } = useAuth();
  const [courts, setCourts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [favorites, setFavorites] = useState(getFavorites);

  function toggleFav(courtId, e) {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(courtId) ? prev.filter((id) => id !== courtId) : [...prev, courtId];
      localStorage.setItem('pp_fav_courts', JSON.stringify(next));
      return next;
    });
  }

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

      {favorites.length > 0 && !selectedId && (
        <>
          <div className="h2" style={{ marginTop: 12 }}>FAVORITES</div>
          {courtsWithDist.filter((ct) => favorites.includes(ct.id)).map((ct) => (
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
              <button className="favBtn favOn" onClick={(e) => toggleFav(ct.id, e)} title="Remove from favorites">{"❤️"}</button>
            </button>
          ))}
          <div className="h2" style={{ marginTop: 12 }}>ALL COURTS</div>
        </>
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
          <button className="favBtn" onClick={(e) => toggleFav(ct.id, e)} title={favorites.includes(ct.id) ? 'Remove from favorites' : 'Add to favorites'}>
            {favorites.includes(ct.id) ? '❤️' : '\u{1F90D}'}
          </button>
        </button>
      ))}
    </div>
  );
}
