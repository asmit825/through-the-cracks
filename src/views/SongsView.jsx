import React, { useState, useEffect } from 'react';
import { getSongs } from '../api';
import Icon from '../components/Icon';
import Pagination from '../components/Pagination';

export default function SongsView({ onSelectArtist }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [songsData, setSongsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getSongs(search, page, 20).then(res => {
      if (isMounted) {
        setSongsData(res.data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [search, page]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <section className="ink-panel panel-pad">
      <div className="controls-bar">
        <div>
          <h2 className="panel-title">
            <Icon name="music_note" />
            Song Library
          </h2>
          <div className="panel-subtitle">
            All {songsData?.pagination?.total?.toLocaleString() || '—'} unique songs
            played on Through the Cracks, ranked by total spins
          </div>
        </div>

        <div className="search-wrapper">
          <Icon name="search" className="search-icon" />
          <input
            id="song-search-input"
            type="search"
            className="search-input"
            placeholder="Search songs or artists…"
            aria-label="Search songs"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {loading ? (
        <div className="state-block state-block--loading">
          <Icon name="graphic_eq" />
          Loading song data…
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table" id="songs-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Song</th>
                  <th>Artist</th>
                  <th>Album</th>
                  <th>First Played</th>
                  <th>Last Played</th>
                  <th>Plays</th>
                </tr>
              </thead>
              <tbody>
                {songsData?.songs?.map((song, idx) => {
                  const rank = ((page - 1) * 20) + idx + 1;
                  return (
                    <tr
                      key={idx}
                      id={`song-row-${rank}`}
                      className="row-clickable"
                      tabIndex={0}
                      onClick={() => onSelectArtist?.(song.artist)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectArtist?.(song.artist);
                        }
                      }}
                    >
                      <td className="cell-mono cell-dim">{rank}</td>
                      <td className="cell-primary">{song.songTitle}</td>
                      <td>{song.artist}</td>
                      <td className="cell-dim">{song.album || '—'}</td>
                      <td className="cell-dim">{song.firstPlayed || '—'}</td>
                      <td className="cell-dim">{song.lastPlayed || '—'}</td>
                      <td><span className="badge badge-accent">{song.totalPlays} spins</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={songsData?.pagination}
            page={page}
            onPageChange={setPage}
            noun="songs"
            idPrefix="song"
          />
        </>
      )}
    </section>
  );
}
