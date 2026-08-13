import React, { useState, useEffect } from 'react';
import { searchAll } from '../api';
import Icon from '../components/Icon';

/**
 * One result column. The icon + label carries group distinction since the
 * palette is monochrome at rest.
 */
function ResultPanel({ icon, title, count, empty, children }) {
  return (
    <section className="ink-panel panel-pad">
      <div className="panel-header">
        <h3 className="panel-title">
          <Icon name={icon} />
          {title}
        </h3>
        <span className="badge">{count}</span>
      </div>
      {count > 0 ? <div className="list-stack">{children}</div> : <p className="state-empty">{empty}</p>}
    </section>
  );
}

export default function SearchView({ onSelectArtist }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      searchAll(query).then(res => {
        setResults(res.data);
        setLoading(false);
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="ink-panel panel-pad-lg">
      <div className="search-hero">
        <h2>Global Catalog Search</h2>
        <p>Search instantly across 36,000+ song plays, 1,600+ artists, and 6,000+ albums</p>

        <div className="search-wrapper search-wrapper--hero">
          <Icon name="search" className="search-icon" size="lg" />
          <input
            id="global-search-input"
            type="search"
            className="search-input search-input--hero"
            placeholder="Artist, song, or album…"
            aria-label="Search the catalog"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {loading && (
        <div className="state-block state-block--loading">
          <Icon name="graphic_eq" />
          Searching catalog…
        </div>
      )}

      {results && !loading && (
        <div className="grid-auto">
          <ResultPanel
            icon="mic"
            title="Artists"
            count={results.artists?.length || 0}
            empty="No matching artists found."
          >
            {results.artists?.map((artist, idx) => (
              <button
                key={idx}
                type="button"
                className="list-row list-row--clickable"
                onClick={() => onSelectArtist?.(artist.name)}
              >
                <span className="list-row-main">
                  <span className="list-row-text">
                    <span className="list-row-title">{artist.name}</span>
                  </span>
                </span>
                <span className="metric-value">{artist.plays} plays</span>
              </button>
            ))}
          </ResultPanel>

          <ResultPanel
            icon="music_note"
            title="Songs"
            count={results.songs?.length || 0}
            empty="No matching songs found."
          >
            {results.songs?.map((song, idx) => (
              <div key={idx} className="list-row">
                <span className="list-row-main">
                  <span className="list-row-text">
                    <span className="list-row-title">"{song.songTitle}"</span>
                    <span className="list-row-sub">{song.artist}</span>
                  </span>
                </span>
                <span className="metric-value">{song.plays} spins</span>
              </div>
            ))}
          </ResultPanel>

          <ResultPanel
            icon="album"
            title="Albums"
            count={results.albums?.length || 0}
            empty="No matching albums found."
          >
            {results.albums?.map((album, idx) => (
              <div key={idx} className="list-row">
                <span className="list-row-main">
                  <span className="list-row-text">
                    <span className="list-row-title">{album.album}</span>
                    <span className="list-row-sub">{album.artist}</span>
                  </span>
                </span>
                <span className="metric-value">{album.plays} spins</span>
              </div>
            ))}
          </ResultPanel>
        </div>
      )}
    </div>
  );
}
