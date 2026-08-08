import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { C } from '../lib/constants';
import { LoadingBall } from './ui';

function MiniBar({ items, maxVal, barColor }) {
  const max = maxVal || Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="miniBarChart">
      {items.map((item, i) => (
        <div key={i} className="miniBarCol">
          <div className="miniBarTrack">
            <div
              className="miniBarFill"
              style={{ height: `${(item.value / max) * 100}%`, background: barColor || C.ball }}
            />
          </div>
          <div className="miniBarLabel">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function OwnerAnalytics({ court }) {
  const [sessions, setSessions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!court?.id) return;
    loadAnalytics();
  }, [court?.id]);

  async function loadAnalytics() {
    setLoading(true);

    const { data: sessData } = await supabase
      .from('sessions')
      .select('*')
      .eq('court_id', court.id);
    const sessList = sessData || [];
    setSessions(sessList);

    if (sessList.length) {
      const ids = sessList.map((s) => s.id);
      const { data: partData } = await supabase
        .from('session_participants')
        .select('session_id, status, joined_at')
        .in('session_id', ids)
        .eq('status', 'confirmed');
      setParticipants(partData || []);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="pane">
        <div className="paneHead">
          <div className="h1">ANALYTICS</div>
          <div className="sub">{court?.name}</div>
        </div>
        <LoadingBall text="Loading analytics…" />
      </div>
    );
  }

  const totalRevenue = sessions.reduce((sum, s) => {
    const count = participants.filter((p) => p.session_id === s.id).length;
    return sum + count * Number(s.fee);
  }, 0);

  const totalPlayers = participants.length;
  const avgPerSession = sessions.length ? Math.round(totalPlayers / sessions.length) : 0;

  const typeCounts = {};
  sessions.forEach((s) => {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });
  const typeLabels = { OPEN_PLAY: 'Open Play', TRAINING: 'Training', RENTAL: 'Rental' };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts = new Array(7).fill(0);
  participants.forEach((p) => {
    if (p.joined_at) {
      const day = new Date(p.joined_at).getDay();
      dayCounts[day]++;
    }
  });
  const dayItems = dayNames.map((label, i) => ({ label, value: dayCounts[i] }));

  const hourCounts = new Array(12).fill(0);
  sessions.forEach((s) => {
    const text = (s.schedule_text || '').toLowerCase();
    const match = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (match) {
      let hour = parseInt(match[1]);
      if (match[3].toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (match[3].toLowerCase() === 'am' && hour === 12) hour = 0;
      const bucket = Math.max(0, Math.min(11, Math.floor((hour - 5) / 1.5)));
      const count = participants.filter((p) => p.session_id === s.id).length;
      hourCounts[bucket] += count;
    }
  });
  const timeSlots = ['5a', '6:30a', '8a', '9:30a', '11a', '12:30p', '2p', '3:30p', '5p', '6:30p', '8p', '9:30p'];
  const timeItems = timeSlots.map((label, i) => ({ label, value: hourCounts[i] }));

  const sessionRevenues = sessions.map((s) => {
    const count = participants.filter((p) => p.session_id === s.id).length;
    return { label: (s.label || '').slice(0, 8), value: count * Number(s.fee) };
  }).slice(0, 8);

  return (
    <div className="pane">
      <div className="paneHead">
        <div className="h1">ANALYTICS</div>
        <div className="sub">{court?.name} performance overview</div>
      </div>

      <div className="statGrid">
        <div className="stat">
          <div className="statK">TOTAL REVENUE</div>
          <div className="statV">{"₱"}{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="statK">TOTAL PLAYERS</div>
          <div className="statV">{totalPlayers}</div>
        </div>
        <div className="stat">
          <div className="statK">AVG PER SESSION</div>
          <div className="statV">{avgPerSession} players</div>
        </div>
        <div className="stat">
          <div className="statK">TOTAL SESSIONS</div>
          <div className="statV">{sessions.length}</div>
        </div>
      </div>

      <div className="analyticsBlock">
        <div className="h2">REVENUE BY SESSION</div>
        {sessionRevenues.length > 0 ? (
          <MiniBar items={sessionRevenues} barColor={C.ball} />
        ) : (
          <div className="sub">No session data yet</div>
        )}
      </div>

      <div className="analyticsBlock">
        <div className="h2">ATTENDANCE BY DAY</div>
        <MiniBar items={dayItems} barColor={C.court} />
      </div>

      <div className="analyticsBlock">
        <div className="h2">POPULAR TIME SLOTS</div>
        <MiniBar items={timeItems} barColor="#D4AF37" />
      </div>

      <div className="analyticsBlock">
        <div className="h2">SESSION BREAKDOWN</div>
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} className="breakdownRow">
            <span className="breakdownLabel">{typeLabels[type] || type}</span>
            <div className="breakdownTrack">
              <div
                className="breakdownFill"
                style={{ width: `${(count / sessions.length) * 100}%` }}
              />
            </div>
            <span className="breakdownVal">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
