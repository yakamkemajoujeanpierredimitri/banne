import { createSignal, createMemo, onMount } from 'solid-js';

export default function AdminRoomsManager() {
  const [rooms, setRooms] = createSignal([]);

  onMount(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        // ensure we format image to image for old mock compatibility or just use imageUrl
        setRooms(data.map(r => ({ ...r, image: r.imageUrl })));
      }
    } catch (err) {
      console.error(err);
    }
  });

  const [search, setSearch] = createSignal('');
  const [maxPrice, setMaxPrice] = createSignal(1000);
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);

  // New room form state
  const [newName, setNewName] = createSignal('');
  const [newDesc, setNewDesc] = createSignal('');
  const [newPrice, setNewPrice] = createSignal(100);
  const [newImage, setNewImage] = createSignal(null);
  const [newAmenities, setNewAmenities] = createSignal('');

  const filteredRooms = createMemo(() => {
    return rooms().filter(room => 
      room.name.toLowerCase().includes(search().toLowerCase()) &&
      room.price <= maxPrice()
    );
  });

  const handleAddRoom = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let imageUrl = '/src/assets/pic4.jpg';
      
      if (newImage()) {
        const formData = new FormData();
        formData.append('image', newImage());
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } else {
          alert('Impossibile caricare l\'immagine. Uso quella predefinita.');
        }
      }

      const amenitiesList = newAmenities().split(',').map(a => a.trim()).filter(a => a);
      
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName(),
          description: newDesc(),
          price: parseFloat(newPrice()),
          image: imageUrl,
          amenities: amenitiesList,
          isAvailable: true
        })
      });
      
      if (res.ok) {
        const newRoom = await res.json();
        setRooms([{ ...newRoom, image: newRoom.imageUrl }, ...rooms()]);
        setShowAddForm(false);
        // Reset form
        setNewName(''); setNewDesc(''); setNewPrice(100); setNewImage(null); setNewAmenities('');
      } else {
        alert('Impossibile aggiungere la camera');
      }
    } catch (err) {
      alert('Si è verificato un errore');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRooms(rooms().filter(r => r.id !== id));
      } else {
        alert('Impossibile eliminare la camera');
      }
    } catch (err) {
      alert('Si è verificato un errore');
    }
  };

  const toggleAvailability = async (id) => {
    const room = rooms().find(r => r.id === id);
    if (!room) return;
    
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !room.isAvailable })
      });
      if (res.ok) {
        setRooms(rooms().map(r => r.id === id ? { ...r, isAvailable: !r.isAvailable } : r));
      } else {
        alert('Impossibile aggiornare la disponibilità');
      }
    } catch (err) {
      alert('Si è verificato un errore');
    }
  };

  return (
    <div class="admin-rooms-manager">
      <div class="rooms-header">
        <h2>Gestione Camere Hotel</h2>
        <button class="btn" onClick={() => setShowAddForm(!showAddForm())}>
          {showAddForm() ? 'Annulla' : '+ Aggiungi Nuova Camera'}
        </button>
      </div>

      {showAddForm() && (
        <form class="add-room-form" onSubmit={handleAddRoom}>
          <h3>Aggiungi una Nuova Camera</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Nome Camera</label>
              <input type="text" required value={newName()} onInput={e => setNewName(e.target.value)} placeholder="es. Suite Presidenziale" />
            </div>
            <div class="form-group">
              <label>Prezzo per Notte ($)</label>
              <input type="number" required min="0" value={newPrice()} onInput={e => setNewPrice(e.target.value)} />
            </div>
            <div class="form-group full-width">
              <label>Descrizione</label>
              <textarea required value={newDesc()} onInput={e => setNewDesc(e.target.value)} rows="3"></textarea>
            </div>
            <div class="form-group full-width">
              <label>Servizi (separati da virgola)</label>
              <input type="text" value={newAmenities()} onInput={e => setNewAmenities(e.target.value)} placeholder="Wi-Fi, TV, Mini-bar" />
            </div>
            <div class="form-group full-width">
              <label>Immagine Camera</label>
              <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} />
            </div>
          </div>
          <button type="submit" class="btn" disabled={isSaving()}>
            {isSaving() ? 'Salvataggio...' : 'Salva Camera'}
          </button>
        </form>
      )}

      <div class="filters-bar">
        <div class="filter-group">
          <label>Cerca Camere</label>
          <input type="text" placeholder="Cerca per nome..." value={search()} onInput={e => setSearch(e.target.value)} />
        </div>
        <div class="filter-group">
          <label>Prezzo Max: ${maxPrice()}</label>
          <input type="range" min="50" max="1000" step="50" value={maxPrice()} onInput={e => setMaxPrice(e.target.value)} />
        </div>
      </div>

      <div class="rooms-grid">
        {filteredRooms().map(room => {
          const isOccupied = room.bookings && room.bookings.length > 0;
          const currentOccupant = isOccupied ? room.bookings[0].user : null;
          const checkOutDate = isOccupied ? new Date(room.bookings[0].checkOutDate).toLocaleDateString() : null;

          return (
          <div class={`admin-room-card ${!room.isAvailable ? 'unavailable' : ''} ${isOccupied ? 'occupied' : ''}`}>
            <div class="thumbnail-wrapper">
                <img src={room.image} alt={room.name} class="room-thumbnail" />
                {!room.isAvailable && <span class="badge-unavailable">Non disponibile</span>}
                {isOccupied && room.isAvailable && <span class="badge-occupied">Occupata</span>}
            </div>
            <div class="room-details">
              <h4>{room.name}</h4>
              <p class="price">${room.price} / notte</p>
              <p class="desc">{room.description}</p>
              <p class="amenities" style="font-size: 0.85rem; color: #666; margin-top: 0.5rem;">
                <strong>Servizi:</strong> {room.amenities && room.amenities.length > 0 ? room.amenities.join(', ') : 'Nessuno'}
              </p>
              {isOccupied && (
                <div class="occupant-info" style="margin-top: 0.75rem; padding: 0.5rem; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px; font-size: 0.9rem; color: #0369a1;">
                  <strong>Attuale Occupante:</strong> {currentOccupant?.name} ({currentOccupant?.email})<br/>
                  <strong>Check-out:</strong> {checkOutDate}
                </div>
              )}
            </div>
            <div class="room-actions">
                <button 
                  class={`action-btn ${room.isAvailable ? 'disable' : 'enable'}`} 
                  onClick={() => toggleAvailability(room.id)}
                >
                  {room.isAvailable ? 'Segna Non Disponibile' : 'Segna Disponibile'}
                </button>
                <button class="action-btn">Modifica</button>
                <button class="action-btn delete" onClick={() => handleDelete(room.id)}>Elimina</button>
            </div>
          </div>
        )})}
        {filteredRooms().length === 0 && <p class="no-results">Nessuna camera corrisponde ai tuoi filtri.</p>}
      </div>
      
      <style>{`
        .admin-room-card.unavailable {
            opacity: 0.8;
            background: #f8fafc;
            border-color: #cbd5e1;
        }
        .admin-room-card.occupied {
            border-color: #bae6fd;
        }
        .thumbnail-wrapper {
            position: relative;
        }
        .badge-unavailable {
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            background: #ef4444;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
        }
        .badge-occupied {
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            background: #0ea5e9;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
        }
        .action-btn.disable {
            color: #d97706;
        }
        .action-btn.enable {
            color: #059669;
        }
      `}</style>
    </div>
  );
}
