import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const SLOTS = ['7:00–8:00', '8:00–9:00', '9:00–10:00', '10:00–11:00'];
const CAPACITY = 24;

const initialSlots = () =>
  SLOTS.reduce((acc, slot) => {
    acc[slot] = [];
    return acc;
  }, {});

export default function App() {
  const [slots, setSlots] = useState(initialSlots());
  const [form, setForm] = useState({ room: '', guests: 1, slot: SLOTS[0] });
  const [log, setLog] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Load booking from Supabase on startup
  useEffect(() => {
    fetchbooking();
  }, []);

  const fetchbooking = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('booking')
      .select('*');

    if (error) {
      console.error('Error loading booking:', error);
      setMessage('Error loading booking.');
    } else {
      const rebuilt = initialSlots();
      data.forEach((b) => {
        if (rebuilt[b.slot]) {
          rebuilt[b.slot].push(b);
        }
      });
      setSlots(rebuilt);
    }
    setLoading(false);
  };

  const totalBooked = (slot) =>
    slots[slot].reduce((sum, b) => sum + b.guests, 0);

  const handleBook = async () => {
    const { room, guests, slot } = form;
    if (!room) return setMessage('Please enter a room number.');
    if (guests < 1) return setMessage('At least 1 guest required.');

    const already = Object.values(slots).find((s) =>
      s.find((b) => b.room === room)
    );
    if (already) return setMessage(`Room ${room} already has a booking.`);
    if (totalBooked(slot) + Number(guests) > CAPACITY)
      return setMessage(`Not enough capacity in ${slot}.`);

    const today = new Date().toISOString().split('T')[0];
    const booking = { room, guests: Number(guests), slot, date: today };

    const { data, error } = await supabase
      .from('booking')
      .insert([booking])
      .select();

    if (error) {
      console.error('Error saving booking:', error);
      return setMessage('Error saving booking. Please try again.');
    }

    setSlots((prev) => ({
      ...prev,
      [slot]: [...prev[slot], data[0]],
    }));
    setLog((prev) => [
      { action: 'Booked', ...booking, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
    setMessage(`Room ${room} booked for ${slot} ✅`);
    setForm({ room: '', guests: 1, slot: SLOTS[0] });
  };

  const handleCancel = async (id, room, slot) => {
    const { error } = await supabase
      .from('booking')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error cancelling booking:', error);
      return setMessage('Error cancelling booking. Please try again.');
    }

    setSlots((prev) => ({
      ...prev,
      [slot]: prev[slot].filter((b) => b.id !== id),
    }));
    setLog((prev) => [
      { action: 'Cancelled', room, slot, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
    setMessage(`Booking for Room ${room} cancelled.`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, fontFamily: 'sans-serif' }}>
        <p>Loading booking...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center' }}>🍳 Breakfast Booking</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>Capacity: {CAPACITY} guests per slot</p>

      {/* Booking Form */}
      <div style={{ background: '#f9f9f9', padding: 24, borderRadius: 12, marginBottom: 32 }}>
        <h2 style={{ marginTop: 0 }}>New Booking</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            placeholder="Room number"
            value={form.room}
            onChange={(e) => setForm({ ...form, room: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', flex: 1 }}
          />
          <input
            type="number"
            min={1}
            max={CAPACITY}
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', width: 80 }}
          />
          <select
            value={form.slot}
            onChange={(e) => setForm({ ...form, slot: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>{s} ({CAPACITY - totalBooked(s)} left)</option>
            ))}
          </select>
          <button
            onClick={handleBook}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Book
          </button>
        </div>
        {message && <p style={{ marginTop: 12, color: '#2563eb' }}>{message}</p>}
      </div>

      {/* Slots */}
      {SLOTS.map((slot) => (
        <div key={slot} style={{ marginBottom: 24, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: '#2563eb', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between' }}>
            <strong>{slot}</strong>
            <span>{totalBooked(slot)} / {CAPACITY} guests</span>
          </div>
          {slots[slot].length === 0 ? (
            <p style={{ padding: '12px 20px', color: '#aaa' }}>No booking yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '8px 20px', textAlign: 'left' }}>Room</th>
                  <th style={{ padding: '8px 20px', textAlign: 'left' }}>Guests</th>
                  <th style={{ padding: '8px 20px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '8px 20px', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {slots[slot].map((b) => (
                  <tr key={b.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '8px 20px' }}>{b.room}</td>
                    <td style={{ padding: '8px 20px' }}>{b.guests}</td>
                    <td style={{ padding: '8px 20px' }}>{b.date}</td>
                    <td style={{ padding: '8px 20px' }}>
                      <button
                        onClick={() => handleCancel(b.id, b.room, b.slot)}
                        style={{ padding: '4px 12px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Log */}
      {log.length > 0 && (
        <div style={{ background: '#f9f9f9', padding: 24, borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>Booking Log</h2>
          {log.map((entry, i) => (
            <p key={i} style={{ margin: '4px 0', fontSize: 14, color: '#444' }}>
              [{entry.time}] {entry.action} — Room {entry.room} {entry.slot && `@ ${entry.slot}`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}