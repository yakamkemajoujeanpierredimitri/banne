import { createSignal } from 'solid-js';

export default function AdminReservationsManager() {
  const [reservations, setReservations] = createSignal([
    { id: 'BKG-001', guestName: 'Jane Doe', room: 'Deluxe Suite', checkIn: '2026-09-10', checkOut: '2026-09-15', status: 'Paid', total: 1250 },
    { id: 'BKG-002', guestName: 'John Smith', room: 'Standard Room', checkIn: '2026-09-12', checkOut: '2026-09-14', status: 'Pending', total: 300 },
    { id: 'BKG-003', guestName: 'Emily Clark', room: 'Family Room', checkIn: '2026-10-01', checkOut: '2026-10-05', status: 'Paid', total: 1200 }
  ]);

  const [showModal, setShowModal] = createSignal(false);
  const [modalMode, setModalMode] = createSignal('add'); // 'add' or 'edit'
  
  // Form State
  const [currentId, setCurrentId] = createSignal('');
  const [guestName, setGuestName] = createSignal('');
  const [room, setRoom] = createSignal('Standard Room');
  const [checkIn, setCheckIn] = createSignal('');
  const [checkOut, setCheckOut] = createSignal('');
  const [status, setStatus] = createSignal('Pending');

  const openAddModal = () => {
    setModalMode('add');
    setGuestName('');
    setRoom('Standard Room');
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
    setCheckIn(res.checkIn);
    setCheckOut(res.checkOut);
    setStatus(res.status);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (modalMode() === 'add') {
      const newBkg = {
        id: `BKG-00${reservations().length + 1}`,
        guestName: guestName(),
        room: room(),
        checkIn: checkIn(),
        checkOut: checkOut(),
        status: status(),
        total: 150 * 2 // placeholder math
      };
      setReservations([newBkg, ...reservations()]);
    } else {
      setReservations(reservations().map(res => 
        res.id === currentId() 
          ? { ...res, guestName: guestName(), room: room(), checkIn: checkIn(), checkOut: checkOut(), status: status() }
          : res
      ));
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
                <select value={room()} onChange={(e) => setRoom(e.target.value)}>
                  <option value="Standard Room">Standard Room</option>
                  <option value="Deluxe Suite">Deluxe Suite</option>
                  <option value="Family Room">Family Room</option>
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
        /* Table Styles from previous design */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        .section-header h2 {
            font-size: 1.8rem;
            color: var(--primary);
        }
        .table-container {
            overflow-x: auto;
        }
        .admin-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }
        .admin-table th, .admin-table td {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
        }
        .admin-table th {
            color: var(--text-muted);
            font-weight: 600;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .admin-table tbody tr:hover {
            background-color: var(--background);
        }
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .status-badge.paid {
            background: #e8f5e9;
            color: #2e7d32;
        }
        .status-badge.pending {
            background: #fff3e0;
            color: #e65100;
        }
        .status-badge.cancelled {
            background: #ffebee;
            color: #c62828;
        }
        .action-btn {
            background: transparent;
            color: var(--primary);
            font-weight: 600;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            transition: background 0.2s;
            border: none;
            cursor: pointer;
        }
        .action-btn:hover {
            background: var(--border);
        }
        .btn-outline {
            background: transparent;
            color: var(--primary);
            border: 1px solid var(--primary);
        }
        .btn-outline:hover {
            background: var(--primary);
            color: white;
        }

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
