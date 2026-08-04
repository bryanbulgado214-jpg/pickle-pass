import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { LoadingBall } from './ui';

const TIME_SLOTS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM',
];

function getWeekDates(startDate) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export default function BookingCalendar({ court, fee, onBook }) {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(true);

  const dates = getWeekDates(weekStart);

  useEffect(() => {
    loadBookings();
  }, [weekStart, court.id]);

  async function loadBookings() {
    setLoading(true);
    const from = dates[0].toISOString();
    const to = new Date(dates[6]);
    to.setDate(to.getDate() + 1);

    const { data } = await supabase
      .from('court_bookings')
      .select('*')
      .eq('court_id', court.id)
      .gte('booking_date', dates[0].toISOString().split('T')[0])
      .lte('booking_date', dates[6].toISOString().split('T')[0]);

    setBookings(data || []);
    setLoading(false);
  }

  function isBooked(date, slot) {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.some((b) => b.booking_date === dateStr && b.time_slot === slot);
  }

  function isMyBooking(date, slot) {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.some(
      (b) => b.booking_date === dateStr && b.time_slot === slot && b.profile_id === user?.id
    );
  }

  function isPast(date, slot) {
    const now = new Date();
    const match = slot.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!match) return false;
    let hour = parseInt(match[1]);
    if (match[3] === 'PM' && hour < 12) hour += 12;
    if (match[3] === 'AM' && hour === 12) hour = 0;
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0, 0);
    return slotTime < now;
  }

  async function handleBook() {
    if (!selected) return;

    if (recurring) {
      const inserts = [];
      for (let w = 0; w < 4; w++) {
        const d = new Date(selected.date);
        d.setDate(d.getDate() + w * 7);
        inserts.push({
          court_id: court.id,
          profile_id: user.id,
          booking_date: d.toISOString().split('T')[0],
          time_slot: selected.slot,
          is_recurring: true,
        });
      }
      await supabase.from('court_bookings').insert(inserts);
    } else {
      const dateStr = selected.date.toISOString().split('T')[0];
      await supabase.from('court_bookings').insert({
        court_id: court.id,
        profile_id: user.id,
        booking_date: dateStr,
        time_slot: selected.slot,
      });
    }

    setSelected(null);
    setRecurring(false);
    loadBookings();
    onBook?.();
  }

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d >= today) setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bookingCal">
      <div className="calHeader">
        <div className="h2" style={{ margin: 0 }}>BOOK A SLOT</div>
        <div className="calNav">
          <button className="calNavBtn" onClick={prevWeek}>{"‹"}</button>
          <span className="calMonth">
            {dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {" – "}
            {dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <button className="calNavBtn" onClick={nextWeek}>{"›"}</button>
        </div>
      </div>

      <div className="calGrid">
        <div className="calCorner" />
        {dates.map((d, i) => (
          <div key={i} className="calDayHead">
            <div className="calDayName">{dayLabels[d.getDay()]}</div>
            <div className="calDayNum">{d.getDate()}</div>
          </div>
        ))}

        {TIME_SLOTS.map((slot) => (
          <div key={slot} className="calTimeRow">
            <div className="calTimeLabel">{slot}</div>
            {dates.map((date, di) => {
              const booked = isBooked(date, slot);
              const mine = isMyBooking(date, slot);
              const past = isPast(date, slot);
              const isSelected = selected?.date.getTime() === date.getTime() && selected?.slot === slot;

              let cls = 'calSlot';
              if (past) cls += ' past';
              else if (mine) cls += ' mine';
              else if (booked) cls += ' taken';
              else if (isSelected) cls += ' selected';
              else cls += ' open';

              return (
                <button
                  key={di}
                  className={cls}
                  disabled={booked || past}
                  onClick={() => !booked && !past && setSelected({ date, slot })}
                  aria-label={`${slot} ${dayLabels[date.getDay()]} ${date.getDate()}`}
                >
                  {mine ? '✓' : booked ? '×' : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selected && (
        <div className="calConfirm">
          <div className="calConfirmText">
            {dayLabels[selected.date.getDay()]}, {selected.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {selected.slot}
          </div>
          <label className="recurringToggle">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            <span>Repeat weekly for 4 weeks</span>
          </label>
          <button className="cta" onClick={handleBook}>
            {recurring
              ? `Book 4 weeks for ₱${fee * 4} via Pickle Pass`
              : `Book for ₱${fee} via Pickle Pass`}
          </button>
        </div>
      )}

      {loading && <LoadingBall text="Loading availability…" />}
    </div>
  );
}
