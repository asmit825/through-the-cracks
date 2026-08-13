import React, { useEffect, useRef } from 'react';
import Icon from './Icon';

export default function EpisodeModal({ episode, onClose }) {
  const closeRef = useRef(null);

  // Escape to dismiss, and move focus into the dialog when it opens so the
  // amber focus ring has somewhere to land.
  useEffect(() => {
    if (!episode) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [episode, onClose]);

  if (!episode) return null;

  const trackCount = episode.songCount || episode.songs?.length || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        id="episode-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="episode-modal-title"
      >
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-accent">#{episode.episodeNumber || 'Episode'}</span>
              <span className="badge">{episode.dayOfWeek} {episode.airDate}</span>
            </div>
            <h2 className="modal-title" id="episode-modal-title">{episode.title}</h2>
          </div>

          <button
            ref={closeRef}
            className="close-btn"
            onClick={onClose}
            id="modal-close-btn"
            aria-label="Close episode details"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-meta">
            <span>
              <Icon name="playlist_play" size="sm" />{' '}
              Total songs <strong className="font-mono text-accent">{trackCount}</strong>
            </span>
            {episode.url && (
              <a
                className="modal-link"
                href={episode.url}
                target="_blank"
                rel="noreferrer"
              >
                View original blog post
                <Icon name="open_in_new" size="sm" />
              </a>
            )}
          </div>

          <div className="track-list">
            {episode.songs && episode.songs.length > 0 ? (
              episode.songs.map((song, idx) => (
                <div key={idx} className="track-item" id={`track-item-${idx + 1}`}>
                  <div className="track-num">
                    {String(song.position || idx + 1).padStart(2, '0')}
                  </div>
                  <div className="track-info">
                    <div className="track-title">{song.songTitle}</div>
                    <div className="track-artist-album">
                      <span className="track-artist">{song.artist}</span>
                      {song.album && <span> — {song.album}</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="state-block state-block--loading">
                <Icon name="graphic_eq" />
                Loading tracklist…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
