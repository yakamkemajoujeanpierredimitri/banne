import { createSignal } from 'solid-js';
import '../styles/global.css';

export default function BookingWidget(props) {
  const [checkIn, setCheckIn] = createSignal('');
  const [checkOut, setCheckOut] = createSignal('');
  const [guests, setGuests] = createSignal(1);
  const [status, setStatus] = createSignal('idle');

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!checkIn() || !checkOut()) return alert('Please select dates.');
    
    setStatus('loading');
    
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: props.roomId,
          checkIn: checkIn(),
          checkOut: checkOut(),
          // Mock userId for now, since auth is not yet implemented
          userId: 'mock-user-id' 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to book');
        setStatus('idle');
        return;
      }
      
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setCheckIn('');
        setCheckOut('');
        setGuests(1);
      }, 3000);
    } catch (err) {
      alert('An error occurred while booking');
      setStatus('idle');
    }
  };

  return (
    <div class="booking-widget">
      <h3>Book Your Stay</h3>
      <p class="price-info">Starting at ${props.price || 150} / night</p>
      
      {status() === 'success' ? (
        <div class="success-message">
          <p>Booking confirmed! We look forward to your stay.</p>
        </div>
      ) : (
        <form onSubmit={handleBooking}>
          <div class="form-group">
            <label for="check-in">Check-in Date</label>
            <input 
              type="date" 
              id="check-in" 
              value={checkIn()} 
              onInput={(e) => setCheckIn(e.target.value)} 
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="check-out">Check-out Date</label>
            <input 
              type="date" 
              id="check-out" 
              value={checkOut()} 
              onInput={(e) => setCheckOut(e.target.value)} 
              required 
            />
          </div>

          <div class="form-group">
            <label for="guests">Guests</label>
            <select 
              id="guests" 
              value={guests()} 
              onChange={(e) => setGuests(e.target.value)}
            >
              <option value="1">1 Guest</option>
              <option value="2">2 Guests</option>
              <option value="3">3 Guests</option>
              <option value="4">4 Guests</option>
            </select>
          </div>

          <button type="submit" class="btn book-btn" disabled={status() === 'loading'}>
            {status() === 'loading' ? 'Processing...' : 'Confirm Booking'}
          </button>
        </form>
      )}
    </div>
  );
}
