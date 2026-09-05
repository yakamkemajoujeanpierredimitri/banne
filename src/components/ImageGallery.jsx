import { createSignal, Show, For } from 'solid-js';

export default function ImageGallery(props) {
  const images = props.images || [];
  const [currentIndex, setCurrentIndex] = createSignal(0);

  if (images.length === 0) return null;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div class="image-gallery">
      <div class="main-image-container">
        <img 
          src={images[currentIndex()]} 
          alt="Room view" 
          class="main-image" 
        />
        <Show when={images.length > 1}>
          <button class="gallery-nav prev" onClick={prevImage}>❮</button>
          <button class="gallery-nav next" onClick={nextImage}>❯</button>
        </Show>
      </div>
      
      <Show when={images.length > 1}>
        <div class="thumbnail-strip">
          <For each={images}>
            {(img, index) => (
              <img 
                src={img} 
                alt="Thumbnail" 
                class={`thumbnail ${index() === currentIndex() ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index())}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
