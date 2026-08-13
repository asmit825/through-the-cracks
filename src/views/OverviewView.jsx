import React from 'react';
import Icon from '../components/Icon';

export default function OverviewView({ data, onSelectArtist }) {
  if (!data) {
    return (
      <div className="state-block state-block--loading">
        <Icon name="graphic_eq" />
        Loading overview stats…
      </div>
    );
  }

  const kpis = [
    {
      id: 'kpi-episodes',
      label: 'Total Episodes',
      value: data.totalEpisodes,
      sub: 'Digitized playlists (2013–2026)',
    },
    {
      id: 'kpi-plays',
      label: 'Song Plays',
      value: data.totalSongPlays,
      sub: 'Individual track spins',
    },
    {
      id: 'kpi-artists',
      label: 'Unique Artists',
      value: data.uniqueArtists,
      sub: 'Independent & roots musicians',
    },
    {
      id: 'kpi-songs',
      label: 'Unique Songs',
      value: data.uniqueSongs,
      sub: `Across ${data.uniqueAlbums?.toLocaleString() ?? '—'} albums`,
    },
  ];

  return (
    <div className="section-stack">
      <div className="kpi-grid">
        {kpis.map(kpi => (
          <div key={kpi.id} className="ink-panel kpi-card">
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value" id={kpi.id}>{kpi.value?.toLocaleString()}</div>
            <div className="kpi-subtext">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Archive timeline — highlighted with thick top rule. */}
      <div className="ink-panel ink-panel--highlight timeline-banner">
        <div>
          <div className="eyebrow">WEVL 89.9 FM Digital Archive Timeline</div>
          <div className="timeline-range">
            <span>{data.dateRange?.earliest}</span>
            <Icon name="arrow_forward" size="sm" />
            <span>{data.dateRange?.latest}</span>
          </div>
        </div>
        <span className="badge badge-accent">On air since Dec 7, 1991 · 34+ years of Memphis radio</span>
      </div>

      <div className="grid-auto">
        {/* Top artists */}
        <section className="ink-panel panel-pad">
          <div className="panel-header">
            <h3 className="panel-title">
              <Icon name="trophy" />
              Most Played Artists
            </h3>
            <span className="badge">All-time</span>
          </div>

          <div className="list-stack">
            {data.topArtists?.map((artist, idx) => (
              <button
                key={idx}
                id={`top-artist-${idx + 1}`}
                type="button"
                className="list-row list-row--clickable"
                onClick={() => onSelectArtist(artist.name)}
              >
                <span className="list-row-main">
                  <span className={`rank-chip ${idx < 3 ? 'rank-chip--top' : ''}`}>
                    {idx + 1}
                  </span>
                  <span className="list-row-title">{artist.name}</span>
                </span>
                <span className="metric-value">{artist.plays} plays</span>
              </button>
            ))}
          </div>
        </section>

        {/* Top songs */}
        <section className="ink-panel panel-pad">
          <div className="panel-header">
            <h3 className="panel-title">
              <Icon name="music_note" />
              Top Played Tracks
            </h3>
            <span className="badge">Most spun</span>
          </div>

          <div className="list-stack">
            {data.topSongs?.map((song, idx) => (
              <div key={idx} id={`top-song-${idx + 1}`} className="list-row">
                <span className="list-row-main">
                  <span className="list-row-text">
                    <span className="list-row-title">"{song.song}"</span>
                    <span className="list-row-sub">{song.artist}</span>
                  </span>
                </span>
                <span className="metric-value">{song.plays} spins</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
