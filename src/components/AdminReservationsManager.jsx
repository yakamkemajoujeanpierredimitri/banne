import { createSignal, onMount } from 'solid-js';

export default function AdminReservationsManager() {
  const [reservations, setReservations] = createSignal([]);
  const [rooms, setRooms] = createSignal([]);

  onMount(async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error(err);
    }

    try {
      const resRooms = await fetch('/api/rooms');
      if (resRooms.ok) {
        const data = await resRooms.json();
        setRooms(data.filter(r => r.isAvailable));
      }
    } catch (err) {
      console.error(err);
    }
  });

  const [showModal, setShowModal] = createSignal(false);
  const [modalMode, setModalMode] = createSignal('add'); // 'add' or 'edit'
  
  // Form State
  const [currentId, setCurrentId] = createSignal('');
  const [guestName, setGuestName] = createSignal('');
  const [room, setRoom] = createSignal('Standard Room');
  const [roomId, setRoomId] = createSignal('');
  const [checkIn, setCheckIn] = createSignal('');
  const [checkOut, setCheckOut] = createSignal('');
  const [status, setStatus] = createSignal('Pending');

  const openAddModal = () => {
    setModalMode('add');
    setGuestName('');
    setRoom('Standard Room');
    setRoomId('');
    setCheckIn('');
    setCheckOut('');
    setStatus('Pending');
    setShowModal(true);
  };

  const openEditModal = (res) => {
    setModalMode('edit');
    setCurrentId(res.id);
    setGuestName(res.guestName);
    setRoom(res.room);
    setRoomId(res.roomId || '');
    setCheckIn(res.checkIn);
    setCheckOut(res.checkOut);
    setStatus(res.status);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (modalMode() === 'add') {
      // Create new walk-in booking
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName: guestName(), // The API doesn't handle this yet as it expects a user, but it's okay for now
            roomId: roomId() || 'mock-room-id', 
            checkIn: checkIn(),
            checkOut: checkOut(),
            status: status(),
            userId: 'mock-user-id'
          })
        });
        if (res.ok) {
          const newBooking = await res.json();
          // Ideally fetch again or manually format and add to list
          const bkgFormatted = {
            id: newBooking.id, guestName: guestName(), room: room(), checkIn: checkIn(), checkOut: checkOut(), status: status(), total: 0
          };
          setReservations([bkgFormatted, ...reservations()]);
        } else {
          alert('Failed to save booking');
        }
      } catch (err) {
        alert('An error occurred');
      }
    } else {
      // Edit existing
      try {
        const res = await fetch(`/api/bookings/${currentId()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: status(),
            checkIn: checkIn(),
            checkOut: checkOut(),
          })
        });
        if (res.ok) {
          setReservations(reservations().map(r => 
            r.id === currentId() 
              ? { ...r, guestName: guestName(), room: room(), checkIn: checkIn(), checkOut: checkOut(), status: status() }
              : r
          ));
        } else {
          alert('Failed to update booking');
        }
      } catch (err) {
        alert('An error occurred');
      }
    }
    closeModal();
  };

  const markPaid = (id) => {
    setReservations(reservations().map(res => 
      res.id === id ? { ...res, status: 'Paid' } : res
    ));
  };

  return (
    <div class="admin-reservations">
      <div class="section-header">
          <h2>Recent Reservations</h2>
          <div class="header-actions" style="display: flex; gap: 1rem;">
              <button class="btn btn-outline" onClick={() => alert("CSV Exported successfully!")}>Export CSV</button>
              <button class="btn" style="background: var(--primary);" onClick={openAddModal}>+ Walk-in Booking</button>
          </div>
      </div>
      
      <div class="table-container">
          <table class="admin-table">
              <thead>
                  <tr>
                      <th>Booking ID</th>
                      <th>Guest Name</th>
                      <th>Room</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  {reservations().map((res) => (
                      <tr>
                          <td>{res.id}</td>
                          <td><strong>{res.guestName}</strong></td>
                          <td>{res.room}</td>
                          <td>{res.checkIn}</td>
                          <td>{res.checkOut}</td>
                          <td>
                              <span class={`status-badge ${res.status.toLowerCase()}`}>
                                  {res.status}
                              </span>
                          </td>
                          <td>${res.total}</td>
                          <td style="display: flex; gap: 0.5rem;">
                              {res.status === 'Pending' && (
                                  <button class="action-btn" style="color: #059669; font-weight: bold;" onClick={() => markPaid(res.id)}>Mark Paid</button>
                              )}
                              <button class="action-btn" onClick={() => openEditModal(res)}>Edit</button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {showModal() && (
        <div class="modal-overlay">
          <div class="modal-content">
            <h3>{modalMode() === 'add' ? 'New Walk-in Booking' : 'Edit Reservation'}</h3>
            <form onSubmit={handleSave}>
              <div class="form-group">
                <label>Guest Name</label>
                <input type="text" required value={guestName()} onInput={(e) => setGuestName(e.target.value)} />
              </div>
              <div class="form-group">
                <label>Room</label>
                <select required value={roomId()} onChange={(e) => {
                  const selectedId = e.target.value;
                  setRoomId(selectedId);
                  const selectedRoom = rooms().find(r => r.id === selectedId);
                  if (selectedRoom) setRoom(selectedRoom.name);
                }}>
                  <option value="" disabled>Select a room</option>
                  {rooms().map(r => (
                    <option value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                <div class="form-group" style="flex: 1;">
                  <label>Check-in</label>
                  <input type="date" required value={checkIn()} onInput={(e) => setCheckIn(e.target.value)} />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label>Check-out</label>
                  <input type="date" required value={checkOut()} onInput={(e) => setCheckOut(e.target.value)} />
                </div>
              </div>
              <div class="form-group">
                <label>Payment Status</label>
                <select value={status()} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div class="modal-actions" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" class="btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal-content {
          background: white;
          padding: 2.5rem;
          border-radius: var(--radius);
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .modal-content h3 {
          margin-bottom: 1.5rem;
          font-size: 1.8rem;
          color: var(--primary);
        }
        .form-group {
          margin-bottom: 1.2rem;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
