# Through the Cracks — Project Documentation

**Project Name:** Through the Cracks (WEVL 89.9 FM Radio Show Dashboard)  
**Host & Station:** Ed Dirmeyer | WEVL 89.9 FM (Memphis, TN)  
**Blog URL:** [https://eddirmeyer.blogspot.com](https://eddirmeyer.blogspot.com)  
**Blogger Blog ID:** `3469042462299367694`  
**GCP Project:** `through-the-cracks`
**Status:** Data Pipeline Complete (Blogger API → BigQuery + JSON) | Frontend UI Pending

---

## 1. Project Goal & Overview

*Through the Cracks* is a long-running radio program out of Memphis, TN, hosted by Ed Dirmeyer on WEVL 89.9 FM. Ed documents every weekly playlist on his Blogspot blog.

The goal of this project is to:
1. **Ingest & Archive**: Pull down 13+ years of raw blog posts via the Blogger API v3.
2. **Clean & Normalize**: Parse unstructured HTML into structured records (`Artist`, `Song Title`, `Album`, `Episode Date`, `Episode #`).
3. **Aggregate & Analyze**: Generate deep statistics (top artists, top songs, album counts, yearly trends, artist first/last appearance timelines).
4. **Visualize**: Present this data in a modern, interactive multi-page web dashboard.

---

## 2. Technical Architecture & Decisions

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Ingestion Phase (Local CLI → future Cloud Scheduler)        │
│                                                              │
│  Blogger API v3 ──► Parse HTML ──► BigQuery LOAD JOB         │
│       (public read-only)          (episodes + song_plays)    │
│                              └──► public/data/*.json (local) │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  BigQuery (through_the_cracks dataset)                       │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐                        │
│  │  episodes    │    │  song_plays  │                        │
│  │  1,317 rows  │    │  36,199 rows │                        │
│  └─────────────┘    └──────────────┘                        │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Dashboard (Vite + React + React Router)                     │
│  Cloud Functions API → queries BigQuery → JSON response      │
│  Fallback: reads static JSON from public/data/               │
└──────────────────────────────────────────────────────────────┘
```

### Key Technical Choices
- **Frontend Stack**: Vite + React + React Router DOM (`react-router-dom`).
- **Backend API Stack**: Express.js API Server (`server/index.js`) querying BigQuery with built-in 10-minute in-memory caching.
- **Data Store**: Google BigQuery (`through-the-cracks.through_the_cracks` dataset) containing `episodes` and `song_plays` tables.
- **Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` for containerized execution of the Node/Express backend and ingestion service.
- **Secrets Management**: Doppler CLI (`doppler run -- <command>`) for centralized, cloud-synced secret management across local dev and Docker containers.
- **Data Loading**: BigQuery load jobs (`table.load()`) uploading NDJSON files (completely free in GCP free tier).
- **GCP Billing**: Billing account linked with a $1 budget alert to prevent unexpected costs.

---

## 3. Data Dataset Summary (Current Ingestion Audit)

The ingestion script was executed against the complete blog history (2013–2026). Here are the exact totals:

| Metric | Count |
|---|---|
| **Total Blog Posts Fetched** | 1,332 |
| **Total Playlist Episodes Parsed** | 1,317 |
| **Total Song Plays** | 36,902 (+703 recovered via enhanced single-dash parser) |
| **Unique Artists** | 1,891 (+243 newly cataloged) |
| **Unique Albums** | 6,340 |
| **Unique Songs** | 16,782 |
| **Date Range Covered** | June 23, 2013 — August 8, 2026 |

### Top 10 Most Played Artists All-Time

1. **Todd Snider** — 295 plays
2. **Bob Dylan** — 263 plays
3. **Lucinda Williams** — 220 plays
4. **Jim Lauderdale** — 212 plays
5. **John Prine** — 192 plays
6. **Steve Forbert** — 181 plays
7. **Joe Ely** — 180 plays
8. **Bonnie Raitt** — 176 plays
9. **Rob Jungklas** — 173 plays
10. **Rodney Crowell** — 168 plays

---

## 4. Key Files & Repository Structure

```
through-the-cracks/
├── .env                       # Local secrets [GITIGNORED - synced to Doppler]
├── .dockerignore              # Prevents node_modules, cache & env files in build context
├── Dockerfile                 # Container setup for Express API & Ingestion service
├── docker-compose.yml         # Container orchestration for local dev & production
├── package.json               # Dependencies (express, cors, @google-cloud/bigquery, react, vite)
├── prototype-parser.js        # Prototype script testing parsing logic against sample posts
│
├── .project-documentation/    # Project documentation (this file)
│   └── project-documentation.md
│
├── server/                    # Express Backend API Server
│   ├── index.js               # REST API Endpoints (/api/overview, /api/episodes, /api/artists, /api/search)
│   └── bigquery.js            # BigQuery client wrapper with 10-minute caching & Doppler key support
│
├── scripts/
│   ├── setup-api-key.sh       # Wizard: Google Cloud API key setup & verification
│   ├── setup-bigquery.sh      # Wizard: gcloud CLI install, BigQuery API, dataset & table creation
│   ├── setup-billing.sh       # Wizard: GCP billing account + $1 budget alert
│   ├── setup-doppler.sh       # Wizard: Doppler CLI install, login, project link & secret sync
│   └── ingest.js              # Ingestion pipeline: Blogger API → parse → BigQuery load jobs
│
├── .cache/                    # Cached raw API responses & BigQuery temp files [GITIGNORED]
│   ├── raw-posts.json         # Raw Blogger API response cache (2.8 MB)
│   ├── bq-episodes.ndjson     # NDJSON temp file for BigQuery episode load
│   └── bq-song-plays.ndjson   # NDJSON temp file for BigQuery song_plays load
│
├── public/
│   └── data/                  # Pre-computed JSON files (local fallback)
│       ├── overview.json
│       ├── episodes.json
│       ├── artists.json
│       ├── albums.json
│       ├── songs.json
│       └── years.json
│
└── src/                       # React frontend source code (pending)
    ├── App.jsx
    ├── main.jsx
    └── index.css
```

---

## 5. Generated Data Contracts (`public/data/`)

### `overview.json`
Contains aggregate summary statistics:
```json
{
  "lastUpdated": "2026-08-09T02:38:58.123Z",
  "totalEpisodes": 1317,
  "totalSongPlays": 36199,
  "uniqueArtists": 1648,
  "uniqueAlbums": 6024,
  "uniqueSongs": 16343,
  "dateRange": {
    "earliest": "2013-06-23",
    "latest": "2026-08-08"
  },
  "topArtists": [...],
  "topSongs": [...],
  "yearSummary": [...]
}
```

### `episodes.json`
Array of all parsed show playlists:
```json
[
  {
    "id": "492815995999333864",
    "title": "Playlist for WEVL's Through The Cracks, Saturday 8/8/2026",
    "airDate": "2026-08-08",
    "dayOfWeek": "Saturday",
    "episodeNumber": 31,
    "publishedAt": "2026-08-08T11:03:00-07:00",
    "url": "https://eddirmeyer.blogspot.com/...",
    "songCount": 27,
    "songs": [
      {
        "position": 1,
        "rawLine": "Jonathan Byrd - Prairie Girl - The Law & The Lonesome",
        "artist": "Jonathan Byrd",
        "songTitle": "Prairie Girl",
        "album": "The Law & The Lonesome"
      }
    ]
  }
]
```

---

## 6. How to Run & Maintain

### 1. First-Time Setup (4 wizards)
```bash
bash scripts/setup-api-key.sh     # Step 1: Blogger API key
bash scripts/setup-bigquery.sh    # Step 2: gcloud CLI + BigQuery dataset
bash scripts/setup-billing.sh     # Step 3: Billing account + budget alert
bash scripts/setup-doppler.sh     # Step 4: Doppler secret management setup
```

### 2. Running with Doppler
```bash
# Run ingestion with Doppler injected secrets
doppler run -- node scripts/ingest.js

# Start Express Backend API with Doppler
doppler run -- npm run server:dev

# Start Docker containers with Doppler (requires Docker Desktop or OrbStack)
doppler run -- docker compose up
```

### 3. API Endpoints Reference
The Express API runs at `http://localhost:3001`:
- `GET /api/overview` — High level KPI summary, date ranges, top 10 artists/songs
- `GET /api/episodes?page=1&limit=20` — Paginated list of 1,317 episodes
- `GET /api/episodes/:id` — Single episode with tracklist
- `GET /api/artists?search=dylan&page=1` — Ranked artists leaderboard with search
- `GET /api/search?q=dylan` — Unified search across artists, songs, and albums
- `POST /api/ingest` — Background ingestion trigger

---

## 7. BigQuery Schema

### Dataset: `through_the_cracks`

**Table: `episodes`** (1,317 rows)
| Column | Type | Description |
|---|---|---|
| `id` | STRING | Blogger post ID (primary key) |
| `title` | STRING | Full post title |
| `air_date` | DATE | Parsed broadcast date |
| `day_of_week` | STRING | Day name |
| `episode_number` | INT64 | Episode number from content |
| `published_at` | TIMESTAMP | Blogger publish timestamp |
| `url` | STRING | Link to original blog post |
| `song_count` | INT64 | Number of songs in this episode |
| `ingested_at` | TIMESTAMP | When we ingested this record |

**Table: `song_plays`** (36,199 rows)
| Column | Type | Description |
|---|---|---|
| `id` | STRING | Generated ID (`{episode_id}_{position}`) |
| `episode_id` | STRING | FK to episodes.id |
| `air_date` | DATE | Denormalized from episode |
| `position` | INT64 | Track position in the show |
| `artist` | STRING | Artist name as written |
| `song_title` | STRING | Song title |
| `album` | STRING | Album / record name |
| `raw_line` | STRING | Original unparsed text line |
| `ingested_at` | TIMESTAMP | When we ingested this record |

---

## 8. GCP Cost & Billing

| GCP Service | Monthly Usage | Free Tier | Cost |
|---|---|---|---|
| BigQuery Storage | ~5 MB | 10 GB free | **$0.00** |
| BigQuery Queries | <1 GB scanned | 1 TB free | **$0.00** |
| Cloud Functions (planned) | ~10K invocations | 2M free | **$0.00** |
| Cloud Scheduler (planned) | 1–3 jobs | 3 jobs free | **$0.00** |
| Blogger API | ~100 calls/month | Unlimited | **$0.00** |
| **Total** | | | **$0.00/month** |

Billing account linked with a **$1 budget alert** — you will be emailed if costs ever exceed $0.50.

---

## 9. Roadmap & Next Steps

Now that the data pipeline is complete and verified, the next phases are:

### Phase 2: API Layer (Cloud Functions)
- [ ] Deploy Cloud Functions to query BigQuery and serve JSON to the dashboard.
- [ ] Endpoints: `/api/overview`, `/api/artists`, `/api/episodes`, `/api/search`.

### Phase 3: Dashboard UI
- [ ] **Overview Page**: High-level KPI cards, hero stats, top 10 charts, recent show feed.
- [ ] **Artists Directory**: Searchable, filterable leaderboard of all 1,648 artists with detail modal/page.
- [ ] **Episode Archive**: Searchable list of all 1,317 episodes with full tracklists.
- [ ] **Global Search**: Search bar to look up any artist, song title, or album across 36,000+ plays.
- [ ] **Analytics & Trends**: Visual charts showing plays by year, artist longevity, and frequency.

### Phase 4: Automation
- [ ] Cloud Scheduler job to trigger ingestion automatically (e.g., daily or twice weekly).
- [ ] Incremental ingestion (only new posts since last run).

### Future Ideas
- [ ] Spotify API integration for album artwork / song previews.
- [ ] MusicBrainz metadata enrichment (genres, release years).
