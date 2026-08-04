import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const REMINDER_LEAD_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export default function SessionReminders({ userId }) {
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (!userId || !('Notification' in window) || Notification.permission !== 'granted') return;

    checkReminders();
    const interval = setInterval(checkReminders, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId]);

  async function checkReminders() {
    const now = new Date();
    const cutoff = new Date(now.getTime() + REMINDER_LEAD_MS);

    const { data: participants } = await supabase
      .from('session_participants')
      .select('id, session:session_id(id, label, scheduled_at, schedule_text, court:court_id(name))')
      .eq('profile_id', userId)
      .eq('status', 'confirmed');

    if (!participants) return;

    const { data: bookings } = await supabase
      .from('court_bookings')
      .select('id, booking_date, time_slot, court:court_id(name)')
      .eq('profile_id', userId);

    const items = [];

    for (const p of participants) {
      if (!p.session?.scheduled_at) continue;
      const sessionTime = new Date(p.session.scheduled_at);
      const diff = sessionTime.getTime() - now.getTime();
      if (diff > 0 && diff <= REMINDER_LEAD_MS) {
        const key = `session-${p.session.id}`;
        if (!notifiedRef.current.has(key)) {
          items.push({
            key,
            title: `${p.session.label} starts soon!`,
            body: `${p.session.court?.name || 'Court'} — in about ${Math.round(diff / 60000)} minutes`,
          });
        }
      }
    }

    for (const b of (bookings || [])) {
      const match = (b.time_slot || '').match(/(\d+):(\d+)\s*(AM|PM)/);
      if (!match) continue;
      let hour = parseInt(match[1]);
      if (match[3] === 'PM' && hour < 12) hour += 12;
      if (match[3] === 'AM' && hour === 12) hour = 0;
      const bookingTime = new Date(b.booking_date + 'T00:00:00');
      bookingTime.setHours(hour, 0, 0, 0);
      const diff = bookingTime.getTime() - now.getTime();
      if (diff > 0 && diff <= REMINDER_LEAD_MS) {
        const key = `booking-${b.id}`;
        if (!notifiedRef.current.has(key)) {
          items.push({
            key,
            title: 'Court booking starts soon!',
            body: `${b.court?.name || 'Court'} at ${b.time_slot} — in about ${Math.round(diff / 60000)} minutes`,
          });
        }
      }
    }

    for (const item of items) {
      notifiedRef.current.add(item.key);
      new Notification(item.title, {
        body: item.body,
        icon: '/icons/icon-192.png',
        tag: item.key,
        vibrate: [200, 100, 200],
      });
    }
  }

  return null;
}
