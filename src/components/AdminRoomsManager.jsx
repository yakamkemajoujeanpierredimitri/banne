import { createSignal, createMemo } from 'solid-js';

export default function AdminRoomsManager() {
  const [rooms, setRooms] = createSignal([
    { id: '1', name: 'Deluxe Suite', price: 250, description: 'Spacious suite with city views.', image: '/src/assets/pic4.jpg', isAvailable: true },
    { id: '2', name: 'Standard Room', price: 150, description: 'Comfortable room for two.', image: '/src/assets/pic5.jpg', isAvailable: true },
    { id: '3', name: 'Family Room', price: 300, description: 'Perfect for families with kids.', image: '/src/assets/pic6.jpg', isAvailable: false },
  ]);

  const [search, setSearch] = createSignal('');
  const [maxPrice, setMaxPrice] = createSignal(1000);
  const [showAddForm, setShowAddForm] = createSignal(false);

  // New room form state
  const [newName, setNewName] = createSignal('');
  const [newDesc, setNewDesc] = createSignal('');
  const [newPrice, setNewPrice] = createSignal(100);
  const [newImage, setNewImage] = createSignal(null);

  const filteredRooms = createMemo(() => {
    return rooms().filter(room => 
      room.name.toLowerCase().includes(search().toLowerCase()) &&
      room.price <= maxPrice()
    );
  });

  const handleAddRoom = (e) => {
    e.preventDefault();
    const newRoom = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName(),
      description: newDesc(),
      price: parseFloat(newPrice()),
      isAvailable: true,
      image: newImage() ? URL.createObjectURL(newImage()) : '/src/assets/pic4.jpg' 
    };
    setRooms([newRoom, ...rooms()]);
    setShowAddForm(false);
    
    // Reset form
    setNewName(''); setNewDesc(''); setNewPrice(100); setNewImage(null);
  };

  const handleDelete = (id) => {
      setRooms(rooms().filter(r => r.id !== id));
  };

  const toggleAvailability = (id) => {
      setRooms(rooms().map(r => r.id === id ? { ...r, isAvailable: !r.isAvailable } : r));
  };

  return (
    <div class="admin-rooms-manager">
      <div class="rooms-header">
        <h2>Hotel Rooms Management</h2>
        <button class="btn" onClick={() => setShowAddForm(!showAddForm())}>
          {showAddForm() ? 'Cancel' : '+ Add New Room'}
        </button>
      </div>

      {showAddForm() && (
        <form class="add-room-form" onSubmit={handleAddRoom}>
          <h3>Add a New Room</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Room Name</label>
              <input type="text" required value={newName()} onInput={e => setNewName(e.target.value)} placeholder="e.g. Presidential Suite" />
            </div>
            <div class="form-group">
              <label>Price per Night ($)</label>
              <input type="number" required min="0" value={newPrice()} onInput={e => setNewPrice(e.target.value)} />
            </div>
            <div class="form-group full-width">
              <label>Description</label>
              <textarea required value={newDesc()} onInput={e => setNewDesc(e.target.value)} rows="3"></textarea>
            </div>
            <div class="form-group full-width">
              <label>Room Picture</label>
              <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} />
            </div>
          </div>
          <button type="submit" class="btn">Save Room</button>
        </form>
      )}

      <div class="filters-bar">
        <div class="filter-group">
          <label>Search Rooms</label>
          <input type="text" placeholder="Search by name..." value={search()} onInput={e => setSearch(e.target.value)} />
        </div>
        <div class="filter-group">
          <label>Max Price: ${maxPrice()}</label>
          <input type="range" min="50" max="1000" step="50" value={maxPrice()} onInput={e => setMaxPrice(e.target.value)} />
        </div>
      </div>

      <div class="rooms-grid">
        {filteredRooms().map(room => (
          <div class={`admin-room-card ${!room.isAvailable ? 'unavailable' : ''}`}>
            <div class="thumbnail-wrapper">
                <img src={room.image} alt={room.name} class="room-thumbnail" />
                {!room.isAvailable && <span class="badge-unavailable">Unavailable</span>}
            </div>
            <div class="room-details">
              <h4>{room.name}</h4>
              <p class="price">${room.price} / night</p>
              <p class="desc">{room.description}</p>
            </div>
            <div class="room-actions">
                <button 
                  class={`action-btn ${room.isAvailable ? 'disable' : 'enable'}`} 
                  onClick={() => toggleAvailability(room.id)}
                >
                  {room.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                </button>
                <button class="action-btn">Edit</button>
                <button class="action-btn delete" onClick={() => handleDelete(room.id)}>Delete</button>
            </div>
          </div>
        ))}
        {filteredRooms().length === 0 && <p class="no-results">No rooms match your filters.</p>}
      </div>
      
      <style>{`
        .admin-room-card.unavailable {
            opacity: 0.8;
            background: #f8fafc;
            border-color: #cbd5e1;
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
