import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { queryBigQuery, clearCache } from './bigquery.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;
const GCP_PROJECT = process.env.GCP_PROJECT_ID || 'through-the-cracks';
const BQ_DATASET = process.env.BQ_DATASET || 'through_the_cracks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(cors());
app.use(express.json());

// Rewrite /through-the-cracks/api to /api
app.use((req, _res, next) => {
  if (req.url.startsWith('/through-the-cracks/api')) {
    req.url = req.url.replace('/through-the-cracks/api', '/api');
  }
  next();
});

// Serve static assets from dist and public/data
if (existsSync(DIST_DIR)) {
  app.use('/through-the-cracks', express.static(DIST_DIR));
  app.use(express.static(DIST_DIR));
}
if (existsSync(PUBLIC_DIR)) {
  app.use('/through-the-cracks/data', express.static(path.join(PUBLIC_DIR, 'data')));
  app.use('/data', express.static(path.join(PUBLIC_DIR, 'data')));
}

// ── Health Check ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: GCP_PROJECT,
    dataset: BQ_DATASET,
    timestamp: new Date().toISOString()
  });
});


// ── 1. Overview Stats ────────────────────────────────────────────────────────

app.get('/api/overview', async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(1) FROM \`${GCP_PROJECT}.${BQ_DATASET}.episodes\`) AS total_episodes,
        (SELECT COUNT(1) FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`) AS total_song_plays,
        (SELECT COUNT(DISTINCT LOWER(artist)) FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`) AS unique_artists,
        (SELECT COUNT(DISTINCT CONCAT(LOWER(artist), '|||', LOWER(album))) FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`) AS unique_albums,
        (SELECT COUNT(DISTINCT CONCAT(LOWER(artist), '|||', LOWER(song_title))) FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`) AS unique_songs,
        (SELECT MIN(air_date) FROM \`${GCP_PROJECT}.${BQ_DATASET}.episodes\`) AS earliest_date,
        (SELECT MAX(air_date) FROM \`${GCP_PROJECT}.${BQ_DATASET}.episodes\`) AS latest_date
    `;

    const topArtistsQuery = `
      SELECT artist, COUNT(1) AS plays
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      GROUP BY artist
      ORDER BY plays DESC
      LIMIT 10
    `;

    const topSongsQuery = `
      SELECT artist, song_title, COUNT(1) AS plays
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      GROUP BY artist, song_title
      ORDER BY plays DESC
      LIMIT 10
    `;

    const [stats] = await queryBigQuery(statsQuery);
    const topArtists = await queryBigQuery(topArtistsQuery);
    const topSongs = await queryBigQuery(topSongsQuery);

    res.json({
      totalEpisodes: Number(stats.total_episodes),
      totalSongPlays: Number(stats.total_song_plays),
      uniqueArtists: Number(stats.unique_artists),
      uniqueAlbums: Number(stats.unique_albums),
      uniqueSongs: Number(stats.unique_songs),
      dateRange: {
        earliest: stats.earliest_date?.value || stats.earliest_date,
        latest: stats.latest_date?.value || stats.latest_date,
      },
      topArtists: topArtists.map(r => ({ name: r.artist, plays: Number(r.plays) })),
      topSongs: topSongs.map(r => ({ artist: r.artist, song: r.song_title, plays: Number(r.plays) }))
    });
  } catch (err) {
    console.error('Error fetching overview:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── 2. Episodes Endpoint ─────────────────────────────────────────────────────

app.get('/api/episodes', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const query = `
      SELECT id, title, air_date, day_of_week, episode_number, published_at, url, song_count
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.episodes\`
      ORDER BY air_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `SELECT COUNT(1) as total FROM \`${GCP_PROJECT}.${BQ_DATASET}.episodes\``;

    const rows = await queryBigQuery(query);
    const [countRow] = await queryBigQuery(countQuery);

    res.json({
      episodes: rows.map(r => ({
        id: r.id,
        title: r.title,
        airDate: r.air_date?.value || r.air_date,
        dayOfWeek: r.day_of_week,
        episodeNumber: Number(r.episode_number),
        publishedAt: r.published_at?.value || r.published_at,
        url: r.url,
        songCount: Number(r.song_count)
      })),
      pagination: {
        page,
        limit,
        total: Number(countRow.total),
        totalPages: Math.ceil(Number(countRow.total) / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching episodes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Single episode details with songs
app.get('/api/episodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const epQuery = `
      SELECT id, title, air_date, day_of_week, episode_number, published_at, url, song_count
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.episodes\`
      WHERE id = @id
    `;
    const songsQuery = `
      SELECT position, artist, song_title, album, raw_line
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      WHERE episode_id = @id
      ORDER BY position ASC
    `;

    const epRows = await queryBigQuery(epQuery, { id });
    if (epRows.length === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const songsRows = await queryBigQuery(songsQuery, { id });
    const ep = epRows[0];

    res.json({
      id: ep.id,
      title: ep.title,
      airDate: ep.air_date?.value || ep.air_date,
      dayOfWeek: ep.day_of_week,
      episodeNumber: Number(ep.episode_number),
      publishedAt: ep.published_at?.value || ep.published_at,
      url: ep.url,
      songCount: Number(ep.song_count),
      songs: songsRows.map(s => ({
        position: Number(s.position),
        artist: s.artist,
        songTitle: s.song_title,
        album: s.album,
        rawLine: s.raw_line
      }))
    });
  } catch (err) {
    console.error('Error fetching episode details:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── 3. Artists Leaderboard ───────────────────────────────────────────────────

app.get('/api/artists', async (req, res) => {
  try {
    const search = (req.query.search || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let whereClause = '';
    if (search) {
      whereClause = `WHERE LOWER(artist) LIKE '%${search.replace(/'/g, "''")}%'`;
    }

    const query = `
      SELECT
        artist AS name,
        COUNT(1) AS total_plays,
        COUNT(DISTINCT LOWER(song_title)) AS unique_songs,
        COUNT(DISTINCT LOWER(album)) AS unique_albums,
        MIN(air_date) AS first_appearance,
        MAX(air_date) AS last_appearance
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      ${whereClause}
      GROUP BY artist
      ORDER BY total_plays DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT artist) AS total
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      ${whereClause}
    `;

    const rows = await queryBigQuery(query);
    const [countRow] = await queryBigQuery(countQuery);

    res.json({
      artists: rows.map(r => ({
        name: r.name,
        totalPlays: Number(r.total_plays),
        uniqueSongs: Number(r.unique_songs),
        uniqueAlbums: Number(r.unique_albums),
        firstAppearance: r.first_appearance?.value || r.first_appearance,
        lastAppearance: r.last_appearance?.value || r.last_appearance,
      })),
      pagination: {
        page,
        limit,
        total: Number(countRow.total),
        totalPages: Math.ceil(Number(countRow.total) / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching artists:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── 4. Unified Search Endpoint ──────────────────────────────────────────────

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 2) {
      return res.json({ artists: [], songs: [], albums: [] });
    }

    const escapedQ = q.replace(/'/g, "''");

    const artistQuery = `
      SELECT artist AS name, COUNT(1) AS plays
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      WHERE LOWER(artist) LIKE '%${escapedQ}%'
      GROUP BY artist
      ORDER BY plays DESC
      LIMIT 10
    `;

    const songQuery = `
      SELECT artist, song_title, album, COUNT(1) AS plays
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      WHERE LOWER(song_title) LIKE '%${escapedQ}%'
      GROUP BY artist, song_title, album
      ORDER BY plays DESC
      LIMIT 10
    `;

    const albumQuery = `
      SELECT artist, album, COUNT(1) AS plays
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      WHERE LOWER(album) LIKE '%${escapedQ}%'
      GROUP BY artist, album
      ORDER BY plays DESC
      LIMIT 10
    `;

    const [artists, songs, albums] = await Promise.all([
      queryBigQuery(artistQuery),
      queryBigQuery(songQuery),
      queryBigQuery(albumQuery)
    ]);

    res.json({
      artists: artists.map(r => ({ name: r.name, plays: Number(r.plays) })),
      songs: songs.map(r => ({ artist: r.artist, songTitle: r.song_title, album: r.album, plays: Number(r.plays) })),
      albums: albums.map(r => ({ artist: r.artist, album: r.album, plays: Number(r.plays) }))
    });
  } catch (err) {
    console.error('Error executing search:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── 5. Songs Leaderboard ─────────────────────────────────────────────────────

app.get('/api/songs', async (req, res) => {
  try {
    const search = (req.query.search || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let whereClause = '';
    if (search) {
      const escaped = search.replace(/'/g, "''");
      whereClause = `WHERE LOWER(artist) LIKE '%${escaped}%' OR LOWER(song_title) LIKE '%${escaped}%'`;
    }

    // Group by artist+song, pick the most-common album per combo
    const query = `
      SELECT
        artist,
        song_title,
        ARRAY_AGG(album ORDER BY cnt DESC LIMIT 1)[OFFSET(0)] AS album,
        SUM(cnt) AS total_plays,
        MIN(first_played) AS first_played,
        MAX(last_played) AS last_played
      FROM (
        SELECT
          artist,
          song_title,
          album,
          COUNT(1) AS cnt,
          MIN(air_date) AS first_played,
          MAX(air_date) AS last_played
        FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
        ${whereClause}
        GROUP BY artist, song_title, album
      )
      GROUP BY artist, song_title
      ORDER BY total_plays DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(1) AS total FROM (
        SELECT 1
        FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
        ${whereClause}
        GROUP BY artist, song_title
      )
    `;

    const rows = await queryBigQuery(query);
    const [countRow] = await queryBigQuery(countQuery);

    res.json({
      songs: rows.map(r => ({
        artist: r.artist,
        songTitle: r.song_title,
        album: r.album || '',
        totalPlays: Number(r.total_plays),
        firstPlayed: r.first_played?.value || r.first_played,
        lastPlayed: r.last_played?.value || r.last_played,
      })),
      pagination: {
        page,
        limit,
        total: Number(countRow.total),
        totalPages: Math.ceil(Number(countRow.total) / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching songs:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── 6. Artist Songs (for modal) ──────────────────────────────────────────────

app.get('/api/artists/:name/songs', async (req, res) => {
  try {
    const artistName = req.params.name;

    const query = `
      SELECT
        song_title,
        ARRAY_AGG(album ORDER BY cnt DESC LIMIT 1)[OFFSET(0)] AS album,
        SUM(cnt) AS total_plays,
        MIN(first_played) AS first_played,
        MAX(last_played) AS last_played
      FROM (
        SELECT
          song_title,
          album,
          COUNT(1) AS cnt,
          MIN(air_date) AS first_played,
          MAX(air_date) AS last_played
        FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
        WHERE artist = @artistName
        GROUP BY song_title, album
      )
      GROUP BY song_title
      ORDER BY total_plays DESC
    `;

    const summaryQuery = `
      SELECT
        COUNT(1) AS total_plays,
        COUNT(DISTINCT LOWER(song_title)) AS unique_songs,
        COUNT(DISTINCT LOWER(album)) AS unique_albums,
        MIN(air_date) AS first_appearance,
        MAX(air_date) AS last_appearance
      FROM \`${GCP_PROJECT}.${BQ_DATASET}.song_plays\`
      WHERE artist = @artistName
    `;

    const [rows, summaryRows] = await Promise.all([
      queryBigQuery(query, { artistName }),
      queryBigQuery(summaryQuery, { artistName })
    ]);

    const summary = summaryRows[0] || {};

    res.json({
      artist: artistName,
      summary: {
        totalPlays: Number(summary.total_plays || 0),
        uniqueSongs: Number(summary.unique_songs || 0),
        uniqueAlbums: Number(summary.unique_albums || 0),
        firstAppearance: summary.first_appearance?.value || summary.first_appearance || '',
        lastAppearance: summary.last_appearance?.value || summary.last_appearance || '',
      },
      songs: rows.map(r => ({
        songTitle: r.song_title,
        album: r.album || '',
        totalPlays: Number(r.total_plays),
        firstPlayed: r.first_played?.value || r.first_played,
        lastPlayed: r.last_played?.value || r.last_played,
      }))
    });
  } catch (err) {
    console.error('Error fetching artist songs:', err);
    res.status(500).json({ error: err.message });
  }
});


// ── 7. Ingestion Runner & Scheduler ──────────────────────────────────────────

async function runIngestion(incremental = true) {
  const mode = incremental ? '--incremental' : '';
  const command = `node scripts/ingest.js ${mode}`.trim();
  console.log(`🔄 Starting automated background ingestion (${incremental ? 'incremental' : 'full'})...`);
  clearCache();

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(`[Ingest]: ${stdout.trim()}`);
    if (stderr) console.warn(`[Ingest Warn]: ${stderr.trim()}`);
    console.log(`✅ Ingestion completed successfully.`);
  } catch (err) {
    console.error(`❌ Ingestion error: ${err.message}`);
  }
}

function scheduleAutomatedIngestion() {
  const ENABLED = process.env.ENABLE_AUTO_INGEST !== 'false';
  if (!ENABLED) {
    console.log('⏰ Automated scheduled ingestion is disabled (ENABLE_AUTO_INGEST=false)');
    return;
  }

  const INTERVAL_HOURS = parseInt(process.env.AUTO_INGEST_HOURS) || 6;
  const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;

  const now = new Date();
  const nextRun = new Date(now);
  const currentHour = now.getUTCHours();
  const nextHour = Math.ceil((currentHour + 1) / INTERVAL_HOURS) * INTERVAL_HOURS;

  nextRun.setUTCHours(nextHour % 24, 0, 0, 0);
  if (nextHour >= 24) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }

  const delayUntilFirstRun = nextRun.getTime() - now.getTime();
  const minutes = Math.round(delayUntilFirstRun / 60000);

  console.log(`⏰ Automated ingestion scheduled every ${INTERVAL_HOURS} hours (00:00, 06:00, 12:00, 18:00 UTC).`);
  console.log(`   First scheduled run in ~${minutes} min at ${nextRun.toISOString()}`);

  setTimeout(() => {
    runIngestion(true);
    setInterval(() => {
      runIngestion(true);
    }, INTERVAL_MS);
  }, delayUntilFirstRun);
}

app.post('/api/ingest', async (req, res) => {
  try {
    const incremental = req.body?.incremental !== false;
    runIngestion(incremental);
    res.json({ message: 'Ingestion task started in background', mode: incremental ? 'incremental' : 'full' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// SPA Fallback: serve index.html for non-API GET requests
if (existsSync(DIST_DIR)) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}


// ── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Express Backend API running at http://localhost:${PORT}`);
  console.log(`📊 Connected to BigQuery: ${GCP_PROJECT}.${BQ_DATASET}`);
  
  // Start automated 6-hour ingestion scheduler
  scheduleAutomatedIngestion();
});
