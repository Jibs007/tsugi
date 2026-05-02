import { useState } from 'react';

export default function AnimeCover({ anime, width = 120, height = 170, style = {} }) {
  const [imgFailed, setImgFailed] = useState(false);
  const w = typeof width === 'number' ? width : 120;
  const showImage = anime.image && !imgFailed;

  return (
    <div
      style={{
        width,
        height,
        flexShrink: 0,
        background: `linear-gradient(160deg, ${anime.color}30 0%, ${anime.color}08 50%, #060608 100%)`,
        borderRadius: 6,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {showImage ? (
        /* Real cover image */
        <img
          src={anime.image}
          alt={anime.title}
          onError={() => setImgFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        /* Fallback placeholder — shown when no image or load fails */
        <>
          <div
            style={{
              position: 'absolute',
              top: '38%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              width: w * 0.58,
              height: w * 0.58,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${anime.color}25 0%, transparent 70%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '36%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              color: anime.color,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: Math.max(9, w * 0.1),
              textAlign: 'center',
              width: '88%',
              lineHeight: 1.3,
              letterSpacing: -0.5,
              opacity: 0.9,
            }}
          >
            {(anime.jp || anime.title || '').slice(0, 4)}
          </div>
        </>
      )}

      {/* Bottom gradient + year — always shown over the image */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
          padding: '28px 8px 8px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 600,
          fontSize: Math.max(9, w * 0.072),
          color: 'rgba(255,255,255,0.85)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {anime.year}
      </div>

      {/* Accent bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: anime.color,
          opacity: 0.7,
        }}
      />
    </div>
  );
}
