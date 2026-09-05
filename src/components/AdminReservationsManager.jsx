import { createSignal, onMount, For, Show } from 'solid-js';
import './AdminReservationsManager.css';

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
          const bkgFormatted = {
            id: newBooking.id, guestName: guestName(), room: room(), checkIn: checkIn(), checkOut: checkOut(), status: status(), total: 0
          };
          setReservations([bkgFormatted, ...reservations()]);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Errore nel salvataggio della prenotazione');
        }
      } catch (err) {
        alert('Si è verificato un errore');
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
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Errore nell\'aggiornamento della prenotazione');
        }
      } catch (err) {
        alert('Si è verificato un errore');
      }
    }
    closeModal();
  };

  const markPaid = async (id) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid' })
      });
      if (res.ok) {
        setReservations(reservations().map(r => 
          r.id === id ? { ...r, status: 'Paid' } : r
        ));
      } else {
        alert('Errore durante l\'aggiornamento dello stato.');
      }
    } catch (err) {
      console.error(err);
      alert('Si è verificato un errore.');
    }
  };

  const handleExportCSV = () => {
    const data = reservations();
    if (data.length === 0) {
      alert("Nessuna prenotazione da esportare.");
      return;
    }

    const headers = ['ID Prenotazione', 'Nome Ospite', 'Camera', 'Check-in', 'Check-out', 'Stato', 'Totale'];
    const csvRows = [headers.join(',')];

    for (const res of data) {
      const row = [
        res.id,
        `"${(res.guestName || '').replace(/"/g, '""')}"`,
        `"${(res.room || '').replace(/"/g, '""')}"`,
        res.checkIn,
        res.checkOut,
        res.status,
        res.total
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `prenotazioni_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div class="admin-reservations">
      <div class="section-header">
          <h2>Prenotazioni Recenti</h2>
          <div class="header-actions" style="display: flex; gap: 1rem;">
              <button class="btn btn-outline" onClick={handleExportCSV}>Esporta CSV</button>
              <button class="btn" style="background: var(--primary);" onClick={openAddModal}>+ Prenotazione Diretta</button>
          </div>
      </div>
      
      <div class="table-container">
          <table class="admin-table">
              <thead>
                  <tr>
                      <th>ID Prenotazione</th>
                      <th>Nome Ospite</th>
                      <th>Camera</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Stato</th>
                      <th>Totale</th>
                      <th>Azioni</th>
                  </tr>
              </thead>
              <tbody>
                  <For each={reservations()}>
                    {(res) => (
                      <tr>
                          <td>{res.id}</td>
                          <td><strong>{res.guestName}</strong></td>
                          <td>{res.room}</td>
                          <td>{res.checkIn}</td>
                          <td>{res.checkOut}</td>
                          <td>
                              <span class={`status-badge ${(res.status || '').toLowerCase()}`}>
                                  {res.status === 'Pending' ? 'In sospeso' : res.status === 'Paid' ? 'Pagato' : res.status === 'Cancelled' ? 'Cancellato' : res.status === 'Pay_at_checkin' ? 'All\'arrivo' : res.status}
                              </span>
                          </td>
                          <td>${res.total}</td>
                          <td style="display: flex; gap: 0.5rem;">
                              <Show when={res.status === 'Pending' || res.status === 'Pay_at_checkin'}>
                                  <button class="action-btn" style="color: #059669; font-weight: bold;" onClick={() => markPaid(res.id)}>Segna Pagato</button>
                              </Show>
                              <button class="action-btn" onClick={() => openEditModal(res)}>Modifica</button>
                          </td>
                      </tr>
                    )}
                  </For>
              </tbody>
          </table>
      </div>

      {showModal() && (
        <div class="modal-overlay">
          <div class="modal-content">
            <h3>{modalMode() === 'add' ? 'Nuova Prenotazione Diretta' : 'Modifica Prenotazione'}</h3>
            <form onSubmit={handleSave}>
              <div class="form-group">
                <label>Nome Ospite</label>
                <input type="text" required value={guestName()} onInput={(e) => setGuestName(e.target.value)} />
              </div>
              <div class="form-group">
                <label>Camera</label>
                <select required value={roomId()} onChange={(e) => {
                  const selectedId = e.target.value;
                  setRoomId(selectedId);
                  const selectedRoom = rooms().find(r => r.id === selectedId);
                  if (selectedRoom) setRoom(selectedRoom.name);
                }}>
                  <option value="" disabled>Seleziona una camera</option>
                  <For each={rooms()}>
                    {(r) => (
                      <option value={r.id}>{r.name}</option>
                    )}
                  </For>
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
                <label>Stato del Pagamento</label>
                <select value={status()} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Pending">In sospeso</option>
                  <option value="Paid">Pagato</option>
                  <option value="Cancelled">Cancellato</option>
                </select>
              </div>
              <div class="modal-actions" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="btn btn-outline" onClick={closeModal}>Annulla</button>
                <button type="submit" class="btn">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
