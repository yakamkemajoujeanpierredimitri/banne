import { createSignal, onMount, Show } from 'solid-js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import '../styles/global.css';
import { useTranslations } from '../i18n/utils';

export default function BookingWidget(props) {
  const [checkIn, setCheckIn] = createSignal('');
  const [checkOut, setCheckOut] = createSignal('');
  const [guests, setGuests] = createSignal(1);
  const [status, setStatus] = createSignal('idle');
  
  const t = useTranslations(props.lang || 'it');

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

  const [paymentOption, setPaymentOption] = createSignal('now');

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
          guests: Number(guests()),
          userId: props.userId,
          paymentOption: paymentOption()
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to book');
        setStatus('idle');
        return;
      }
      
      const bookingData = await response.json();

      if (paymentOption() === 'later') {
        setStatus('success');
        window.location.href = `/booking/success`;
        return;
      }

      // Create checkout session for 'now'
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
      <h3>{t('booking.title')}</h3>
      <p class="price-info">{t('booking.startingAt')}{props.price || 150}{t('booking.perNight')}</p>
      
      <Show when={status() === 'success'} fallback={
        <form onSubmit={handleBooking}>
          <div class="form-group">
            <label for="check-in">{t('booking.checkIn')}</label>
            <input 
              type="text" 
              id="check-in" 
              ref={el => checkInRef = el}
              placeholder={t('booking.selectDate')}
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="check-out">{t('booking.checkOut')}</label>
            <input 
              type="text" 
              id="check-out" 
              ref={el => checkOutRef = el}
              placeholder={t('booking.selectDate')}
              required 
            />
          </div>

          <div class="form-group">
            <label for="guests">{t('booking.guests')}</label>
            <select 
              id="guests" 
              value={guests()} 
              onChange={(e) => setGuests(e.target.value)}
            >
              <option value="1">{t('booking.guest1')}</option>
              <option value="2">{t('booking.guest2')}</option>
              <option value="3">{t('booking.guest3')}</option>
              <option value="4">{t('booking.guest4')}</option>
            </select>
          </div>

          <div class="form-group payment-options">
            <label style="margin-bottom: 0.5rem; display: block;">{t('booking.paymentMethod') || 'Payment Method'}</label>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="font-weight: normal; display: flex; align-items: center; gap: 0.5rem;">
                <input 
                  type="radio" 
                  name="payment" 
                  value="now" 
                  checked={paymentOption() === 'now'}
                  onChange={() => setPaymentOption('now')}
                />
                {t('booking.payNow') || 'Pay Now (Stripe)'}
              </label>
              <label style="font-weight: normal; display: flex; align-items: center; gap: 0.5rem;">
                <input 
                  type="radio" 
                  name="payment" 
                  value="later" 
                  checked={paymentOption() === 'later'}
                  onChange={() => setPaymentOption('later')}
                />
                {t('booking.payLater') || 'Pay at Check-in'}
              </label>
            </div>
          </div>

          <button type="submit" class="btn book-btn" disabled={status() === 'loading'}>
            {status() === 'loading' ? t('booking.processing') : t('booking.confirm')}
          </button>
        </form>
      }>
        <div class="success-message">
          <p>{t('booking.success')}</p>
        </div>
      </Show>
    </div>
  );
}
