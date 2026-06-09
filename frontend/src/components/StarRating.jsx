import { useState } from "react";

export default function StarRating({ value, onChange, label }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="star-rating">
      <span className="star-label">{label}</span>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= (hover || value) ? "filled" : ""}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onTouchStart={() => onChange(star)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
