import React, { useEffect, useRef, useState } from 'react';
import { getArtistSongs } from '../api';
import Icon from './Icon';

export default function ArtistSongsModal({ artistName, onClose }) {
  const closeRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch artist songs when the modal opens
  useEffect(() => {
    if (!artistName) return;
    setLoading(true);
    setData(null);
    getArtistSongs(artistName).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [artistName]);

  // Escape to dismiss + lock body scroll + focus trap
  useEffect(() => {
    if (!artistName) return;

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
  }, [artistName, onClose]);

  if (!artistName) return null;

  const summary = data?.summary || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content--wide"
        onClick={e => e.stopPropagation()}
        id="artist-songs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="artist-modal-title"
      >
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-accent">
                <Icon name="mic" size="sm" />
                Artist
              </span>
              {!loading && (
                <span className="badge">
                  {summary.firstAppearance || '—'} → {summary.lastAppearance || '—'}
                </span>
              )}
            </div>
            <h2 className="modal-title" id="artist-modal-title">{artistName}</h2>
          </div>

          <button
            ref={closeRef}
            className="close-btn"
            onClick={onClose}
            id="artist-modal-close-btn"
            aria-label="Close artist details"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body">
          {/* Summary stats bar */}
          {!loading && data && (
            <div className="artist-modal-stats">
              <div className="artist-stat">
                <Icon name="play_circle" size="sm" />
                <span className="artist-stat-value">{summary.totalPlays?.toLocaleString()}</span>
                <span className="artist-stat-label">Total Spins</span>
              </div>
              <div className="artist-stat">
                <Icon name="music_note" size="sm" />
                <span className="artist-stat-value">{summary.uniqueSongs?.toLocaleString()}</span>
                <span className="artist-stat-label">Songs</span>
              </div>
              <div className="artist-stat">
                <Icon name="album" size="sm" />
                <span className="artist-stat-value">{summary.uniqueAlbums?.toLocaleString()}</span>
                <span className="artist-stat-label">Albums</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="state-block state-block--loading">
              <Icon name="graphic_eq" />
              Loading songs for {artistName}…
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" id="artist-songs-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Song</th>
                    <th>Album</th>
                    <th>First Played</th>
                    <th>Last Played</th>
                    <th>Plays</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.songs?.map((song, idx) => (
                    <tr key={idx} id={`artist-song-row-${idx + 1}`}>
                      <td className="cell-mono cell-dim">{idx + 1}</td>
                      <td className="cell-primary">{song.songTitle}</td>
                      <td className="cell-dim">{song.album || '—'}</td>
                      <td className="cell-dim">{song.firstPlayed || '—'}</td>
                      <td className="cell-dim">{song.lastPlayed || '—'}</td>
                      <td><span className="badge badge-accent">{song.totalPlays} spins</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data?.songs?.length === 0 && (
                <div className="state-block">
                  <Icon name="music_off" />
                  No songs found for this artist
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
