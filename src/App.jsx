import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import EpisodeModal from './components/EpisodeModal';
import ArtistSongsModal from './components/ArtistSongsModal';
import OverviewView from './views/OverviewView';
import ArtistsView from './views/ArtistsView';
import SongsView from './views/SongsView';
import EpisodesView from './views/EpisodesView';
import SearchView from './views/SearchView';
import { getOverview } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [dataSource, setDataSource] = useState('static-json');
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistFilter, setArtistFilter] = useState('');

  // Theme: read initial value from DOM (set by inline script in index.html).
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'light'
  );

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('ttc-theme', next);
  };

  useEffect(() => {
    getOverview().then(res => {
      setOverviewData(res.data);
      setDataSource(res.source);
    });
  }, []);

  // Open the Artist Songs Modal for a given artist name
  const handleSelectArtist = (artistName) => {
    setSelectedArtist(artistName);
  };

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dataSource={dataSource}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="app-main">
        {activeTab === 'overview' && (
          <OverviewView
            data={overviewData}
            onSelectArtist={handleSelectArtist}
          />
        )}

        {activeTab === 'artists' && (
          <ArtistsView
            initialSearch={artistFilter}
            onSelectArtist={handleSelectArtist}
          />
        )}

        {activeTab === 'songs' && (
          <SongsView onSelectArtist={handleSelectArtist} />
        )}

        {activeTab === 'episodes' && (
          <EpisodesView onSelectEpisode={setSelectedEpisode} />
        )}

        {activeTab === 'search' && (
          <SearchView onSelectArtist={handleSelectArtist} />
        )}
      </main>

      {/* Episode Details Modal */}
      <EpisodeModal
        episode={selectedEpisode}
        onClose={() => setSelectedEpisode(null)}
      />

      {/* Artist Songs Modal */}
      <ArtistSongsModal
        artistName={selectedArtist}
        onClose={() => setSelectedArtist(null)}
      />

      <footer className="app-footer">
        <div>Through the Cracks · WEVL 89.9 FM Radio Archive · Hosted by Ed Dirmeyer · Premiered Dec 7, 1991</div>
        <div className="font-mono">
          Blogger API v3 &amp; Google BigQuery · 36,902 song spins recorded (2013–2026 digital archive)
        </div>
      </footer>
    </div>
  );
}
