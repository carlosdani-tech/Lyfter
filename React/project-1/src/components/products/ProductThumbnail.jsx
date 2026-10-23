import { useState } from "react";

export default function ProductThumbnail({ imageUrl, name }) {
  const [failedUrl, setFailedUrl] = useState(null);
  if (!imageUrl || failedUrl === imageUrl) {
    return <span className="cart-thumbnail cart-thumbnail--fallback" role="img"
      aria-label={`Imagen no disponible de ${name}`}><span aria-hidden="true">🐾</span></span>;
  }
  return <img className="cart-thumbnail" src={imageUrl} alt={`Imagen de ${name}`}
    loading="lazy" width="112" height="112" onError={() => setFailedUrl(imageUrl)} />;
}
