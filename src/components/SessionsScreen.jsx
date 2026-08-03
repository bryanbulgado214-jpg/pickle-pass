import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { haversineKm } from '../lib/utils';
import { SearchFilterBar } from './ui';
import SessionCard from './SessionCard';
import CourtDetail from './CourtDetail';
import TournamentCard from './TournamentCard';
import TournamentDetail from './TournamentDetail';

export default function SessionsScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [courts, setCourts] = useState({});
  const [participants, setParticipants] = useState({});
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const [tournaments, setTournaments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [tourneyOpen, setTourneyOpen] = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const { data: sessData } = await supabase
      .from('sessions')
      .select(`
        *,
        court:court_id(*)
      `)
      .order('created_at', { ascending: false });

    const sessionList = sessData || [];
    const courtMap = {};
    sessionList.forEach((s) => {
      if (s.court) courtMap[s.court.id] = s.court;
    });

    const sessionIds = sessionList.map((s) => s.id);
    let partMap = {};
    if (sessionIds.length > 0) {
      const { data: partData } = await supabase
        .from('session_participants')
        .select('*, profiles:profile_id(id, full_name, photo_url)')
        .in('session_id', sessionIds);
      (partData || []).forEach((p) => {
        if (!partMap[p.session_id]) partMap[p.session_id] = [];
        partMap[p.session_id].push(p);
      });
    }

    const { data: tourneyData } = await supabase
      .from('tournaments')
      .select('*, court:court_id(id, name, town, verified)')
      .order('created_at', { ascending: false });

    setSessions(sessionList);
    setCourts(courtMap);
    setParticipants(partMap);
    setTournaments(tourneyData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  let filtered = sessions.filter((s) => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const court = s.court;
      const hay = [s.label, court?.name, court?.town].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sortBy === 'price') {
    filtered.sort((a, b) => Number(a.fee) - Number(b.fee));
  } else if (sortBy === 'soonest') {
    filtered.sort((a, b) => {
      const da = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
      const db = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
      return da - db;
    });
  } else if (sortBy === 'distance' && userLocation) {
    filtered.sort((a, b) => {
      const ca = a.court;
      const cb = b.court;
      if (!ca || !cb) return 0;
      const distA = haversineKm(userLocation.lat, userLocation.lng, ca.lat, ca.lng);
      const distB = haversineKm(userLocation.lat, userLocation.lng, cb.lat, cb.lng);
      return distA - distB;
    });
  }

  if (tourneyOpen) {
    return (
      <TournamentDetail
        tournament={tourneyOpen}
        court={tourneyOpen.court}
        onBack={() => setTourneyOpen(null)}
      />
    );
  }

  if (detail) {
    return (
      <CourtDetail
        session={detail.session}
        court={detail.court}
        onBack={() => { setDetail(null); loadSessions(); }}
      />
    );
  }

  return (
    <div className="pane">
      <div className="paneHead">
        <h1 className="h1">Sessions Near You</h1>
        <div className="sub">Browse open play, training, and rentals</div>
      </div>

      {tournaments.length > 0 && (
        <>
          <div className="h2" style={{ marginTop: 0 }}>{"\u{1F3C6}"} UPCOMING TOURNAMENTS</div>
          <div className="tourneyStrip">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} court={t.court} onOpen={setTourneyOpen} />
            ))}
          </div>
        </>
      )}

      <SearchFilterBar
        query={searchQuery}
        onQuery={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        sortBy={sortBy}
        onSortBy={setSortBy}
      />

      {loading && (
        <div className="empty">
          <p style={{ color: C.sand }}>Loading sessions…</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <p style={{ color: C.sand, fontSize: 14 }}>
            No sessions found. Check back later or adjust your filters.
          </p>
        </div>
      )}

      {filtered.map((s) => (
        <SessionCard
          key={s.id}
          session={s}
          court={s.court || {}}
          participants={participants[s.id] || []}
          onOpen={(sess, ct) => setDetail({ session: sess, court: ct })}
        />
      ))}
    </div>
  );
}
