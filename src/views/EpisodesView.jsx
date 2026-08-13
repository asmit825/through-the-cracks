import React, { useState, useEffect } from 'react';
import { getEpisodes, getEpisodeById } from '../api';
import Icon from '../components/Icon';
import Pagination from '../components/Pagination';

export default function EpisodesView({ onSelectEpisode }) {
  const [page, setPage] = useState(1);
  const [episodesData, setEpisodesData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getEpisodes(page, 20).then(res => {
      if (isMounted) {
        setEpisodesData(res.data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [page]);

  const handleEpisodeClick = async (ep) => {
    try {
      const fullEp = await getEpisodeById(ep.id);
      onSelectEpisode(fullEp.data);
    } catch {
      onSelectEpisode(ep);
    }
  };

  return (
    <section className="ink-panel panel-pad">
      <div className="controls-bar">
        <div>
          <h2 className="panel-title">
            <Icon name="radio" />
            Show Playlist Archive
          </h2>
          <div className="panel-subtitle">
            Browse tracklists from all{' '}
            {episodesData?.pagination?.total?.toLocaleString() || '1,317'} broadcast episodes
          </div>
        </div>
      </div>

      {loading ? (
        <div className="state-block state-block--loading">
          <Icon name="graphic_eq" />
          Loading episode archive…
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table" id="episodes-table">
              <thead>
                <tr>
                  <th>Air Date</th>
                  <th>Day</th>
                  <th>Episode</th>
                  <th>Show Title</th>
                  <th>Tracks</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {episodesData?.episodes?.map((ep, idx) => (
                  <tr
                    key={idx}
                    id={`episode-row-${idx + 1}`}
                    className="row-clickable"
                    tabIndex={0}
                    onClick={() => handleEpisodeClick(ep)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEpisodeClick(ep);
                      }
                    }}
                  >
                    <td className="cell-primary">{ep.airDate}</td>
                    <td><span className="badge">{ep.dayOfWeek || 'Show'}</span></td>
                    <td>
                      {ep.episodeNumber ? (
                        <span className="badge badge-accent">#{ep.episodeNumber}</span>
                      ) : (
                        <span className="cell-dim">—</span>
                      )}
                    </td>
                    <td className="cell-primary">{ep.title}</td>
                    <td className="cell-mono">
                      {ep.songCount || ep.songs?.length || 0}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEpisodeClick(ep);
                        }}
                        aria-label={`View playlist for ${ep.title}`}
                      >
                        <Icon name="playlist_play" size="sm" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={episodesData?.pagination}
            page={page}
            onPageChange={setPage}
            noun="episodes"
            idPrefix="episodes"
          />
        </>
      )}
    </section>
  );
}
