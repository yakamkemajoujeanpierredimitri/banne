import { createSignal, onMount } from 'solid-js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import '../styles/global.css';

export default function BookingWidget(props) {
  const [checkIn, setCheckIn] = createSignal('');
  const [checkOut, setCheckOut] = createSignal('');
  const [guests, setGuests] = createSignal(1);
  const [status, setStatus] = createSignal('idle');

  let checkInRef;
  let checkOutRef;

  onMount(() => {
    const disabledDates = (props.blockedDates || []).map(b => ({
      from: b.from,
      to: b.to
    }));

    const checkInPicker = flatpickr(checkInRef, {
      minDate: "today",
      disable: disabledDates,
      onChange: (selectedDates, dateStr) => {
        setCheckIn(dateStr);
        if (selectedDates.length > 0) {
           const nextDay = new Date(selectedDates[0]);
           nextDay.setDate(nextDay.getDate() + 1);
           checkOutPicker.set('minDate', nextDay);
        }
      }
    });

    const checkOutPicker = flatpickr(checkOutRef, {
      minDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // tomorrow
      disable: disabledDates,
      onChange: (selectedDates, dateStr) => {
        setCheckOut(dateStr);
      }
    });
  });

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!props.userId) {
      window.location.href = '/login';
      return;
    }
    
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
          userId: props.userId 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to book');
        setStatus('idle');
        return;
      }
      
      const bookingData = await response.json();

      // Create checkout session
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingData.id })
      });

      if (!checkoutResponse.ok) {
        const error = await checkoutResponse.json();
        alert(error.error || 'Failed to initialize payment');
        setStatus('idle');
        return;
      }

      const checkoutData = await checkoutResponse.json();
      
      setStatus('success');
      // Redirect to Stripe Checkout
      window.location.href = checkoutData.url;
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
              type="text" 
              id="check-in" 
              ref={checkInRef}
              placeholder="Select Date..."
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="check-out">Check-out Date</label>
            <input 
              type="text" 
              id="check-out" 
              ref={checkOutRef}
              placeholder="Select Date..."
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
