# 🎵 Staytup Music Backend API Documentation

Welcome to the **Staytup Music Backend API** documentation. This RESTful API powers the Staytup Music client, offering high-fidelity music streaming, smart search with field operators, curated artist feeds, LRCLIB synchronized lyrics, 4-digit PIN authentication, playlist management, listening analytics, and multi-platform playlist importers (YouTube and Spotify).

---

## 📋 Table of Contents

1. [Architecture & Technology Stack](#-architecture--technology-stack)
2. [Base URL & Routing Setup](#-base-url--routing-setup)
3. [Global Headers & Conventions](#-global-headers--conventions)
4. [Standard Data Models](#-standard-data-models)
5. [Endpoints Reference](#-endpoints-reference)
   - [Health & System](#health--system)
   - [Search & Discovery](#search--discovery)
   - [Music, Streams & Content](#music-streams--content)
   - [Artists](#artists)
   - [Lyrics Service](#lyrics-service)
   - [Authentication](#authentication)
   - [User Profile, History & Favorites](#user-profile-history--favorites)
   - [Playlists & Community](#playlists--community)
   - [Referral Program](#referral-program)
   - [Premium & Subscriptions](#premium--subscriptions)
   - [Playlist Importers (YouTube & Spotify)](#playlist-importers-youtube--spotify)
6. [Error Handling](#-error-handling)
7. [Storage Architecture & Production Migration](#-storage-architecture--production-migration)
8. [Configuration & Environment](#-configuration--environment)

---

## 🏗 Architecture & Technology Stack

- **Runtime**: PHP 7.4+ or PHP 8.0+
- **Encryption / Decryption**: OpenSSL (`des-ede3` / `DES-ECB`) with an 8-byte key to decrypt JioSaavn high-bitrate media URLs.
- **External Providers**:
  - **JioSaavn API v4 (`web6dot0`)**: Primary catalog for music, tracks, albums, playlists, and artists.
  - **LRCLIB API**: Synchronized timestamped `.lrc` and plain-text lyrics provider.
  - **YouTube Innertube Web Scraper**: Extracts YouTube playlists using continuation commands (handles 5,000+ tracks without 100-song limits).
  - **Spotify Embed & oEmbed Engine**: Scrapes and extracts tracklists from public Spotify playlists.
- **Storage Layer**: Modular local JSON storage (`Storage` class under `data/`) with a drop-in architecture for Firebase Admin SDK or MySQL.

---

## 🌐 Base URL & Routing Setup

### Base Path
Depending on your server configuration, the API is available at:
- Standard Root: `http://localhost/api/` or `https://yourdomain.com/api/`
- Subfolder Deployment: `http://localhost/odera/api/`

### URL Rewriting
The API includes an `.htaccess` file supporting clean URL routing via Apache `mod_rewrite`:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /api/
    RewriteCond %{REQUEST_FILENAME} -f
    RewriteRule ^ - [L]
    RewriteRule ^(.*)$ index.php/$1 [L,QSA]
</IfModule>
```

#### Nginx Configuration Example
```nginx
location /api/ {
    try_files $uri $uri/ /api/index.php?$query_string;
}
```

#### Fallback Without URL Rewriting
If `mod_rewrite` is disabled on your server, prefix paths with `index.php`:
`http://localhost/api/index.php/search?q=Arijit`

---

## 🛡 Global Headers & Conventions

### CORS (Cross-Origin Resource Sharing)
All responses automatically include standard permissive CORS headers:
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-User-Id, Accept, Origin, User-Agent
Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges
Content-Type: application/json; charset=utf-8
```
*Preflight `OPTIONS` requests are automatically answered with HTTP `204 No Content`.*

### User Context
For user-specific routes (history, favorites, playlists, profile), pass the user identifier either as:
- Header: `X-User-Id: <user_id>`
- Query Parameter: `?user_id=<user_id>`
- Request Body (for `POST`/`PUT`): `{"user_id": "<user_id>"}`

---

## 📦 Standard Data Models

### 1. Track Object (`song`)
```json
{
  "id": "saavn_ABC12345",
  "videoId": "ABC12345",
  "video_id": "ABC12345",
  "title": "Kesariya",
  "artist": "Arijit Singh, Pritam, Amitabh Bhattacharya",
  "album": "Brahmastra",
  "image": "https://c.saavncdn.com/123/Kesariya-500x500.jpg",
  "thumbnail": "https://c.saavncdn.com/123/Kesariya-500x500.jpg",
  "artwork_url": "https://c.saavncdn.com/123/Kesariya-500x500.jpg",
  "duration": 268,
  "duration_seconds": 268,
  "encrypted_media_url": "ABC==",
  "perma_url": "https://www.jiosaavn.com/song/kesariya/...",
  "source": "saavn",
  "type": "song"
}
```
> **Note**: Image URLs from JioSaavn are automatically upgraded to highest quality (500x500 px) by replacing low-res CDN segments (`50x50`, `150x150`, `250x250`).

### 2. Artist Object (`artist`)
```json
{
  "id": "459320",
  "name": "Arijit Singh",
  "image": "https://c.saavncdn.com/artists/Arijit_Singh_500x500.jpg",
  "thumbnail": "https://c.saavncdn.com/artists/Arijit_Singh_500x500.jpg",
  "type": "artist"
}
```

### 3. Album Object (`album`)
```json
{
  "id": "31940562",
  "title": "Aashiqui 2",
  "name": "Aashiqui 2",
  "artist": "Mithoon, Ankit Tiwari, Jeet Gannguli",
  "image": "https://c.saavncdn.com/123/Aashiqui-2-500x500.jpg",
  "thumbnail": "https://c.saavncdn.com/123/Aashiqui-2-500x500.jpg",
  "artwork_url": "https://c.saavncdn.com/123/Aashiqui-2-500x500.jpg",
  "year": "2013",
  "song_count": 11,
  "type": "album",
  "tracks": [ /* Array of Track Objects */ ]
}
```

### 4. Playlist Object (`playlist`)
```json
{
  "id": "pl_1710340000_a1b2c3d4",
  "name": "My Favorites 2026",
  "description": "Late night chill & focus tracks",
  "cover_url": "https://c.saavncdn.com/...",
  "is_public": true,
  "track_count": 15,
  "created_at": "2026-03-13T15:30:00+00:00",
  "tracks": [ /* Array of Track Objects */ ]
}
```

---

## 🚀 Endpoints Reference

---

### Health & System

#### 1. API Status
Returns service identity and basic metadata.
- **Method**: `GET`
- **Path**: `/api` or `/api/`
- **Response**:
```json
{
  "name": "Staytup Music",
  "version": "2.8.1",
  "status": "running",
  "docs": "See README.md for API documentation"
}
```

#### 2. Health Check
Checks backend responsiveness.
- **Method**: `GET`
- **Path**: `/api/health`
- **Response**:
```json
{
  "status": "ok",
  "source": "php_backend",
  "version": "2.8.1"
}
```

---

### Search & Discovery

#### 1. Universal Search
Search across tracks, artists, albums, and playlists with optional smart search operators.
- **Method**: `GET`
- **Path**: `/api/search`
- **Query Parameters**:
  - `q` *(string, required)*: The search query string or expression.
  - `type` *(string, optional)*: Search target type. Options: `songs` *(default)*, `artists`, `albums`, `playlists`, `all`.
  - `offset` *(integer, optional, default: `0`)*: Item offset for pagination.
  - `limit` *(integer, optional, default: `40`)*: Number of results per page.

##### 🔍 Search Operators
You can combine natural language queries with structured key-value filters:
- `artist:"Arijit Singh"` or `singer:"Taylor Swift"`
- `genre:romantic` or `genre:pop`
- `mood:chill`
- `year:2024`
- `lyrics:"tu safar mera"`
- `lang:hindi` or `language:punjabi`

*Example*: `/api/search?q=genre:lofi artist:"Karan Aujla"`

- **Response (`type=songs`)**:
```json
{
  "query": "genre:lofi artist:\"Karan Aujla\"",
  "count": 150,
  "results": [ /* Track Objects */ ],
  "tracks": [ /* Track Objects */ ],
  "has_more": true,
  "operators": {
    "genre": "lofi",
    "artist": "Karan Aujla"
  },
  "parsed_query": "Karan Aujla lofi"
}
```

- **Response (`type=all`)**:
```json
{
  "query": "Diljit",
  "resolved": "Diljit",
  "operators": {},
  "tracks": [ /* Up to 25 Track Objects */ ],
  "artists": [ /* Up to 6 Artist Objects */ ],
  "albums": [ /* Up to 8 Album Objects */ ],
  "playlists": [ /* Up to 8 Playlist Objects */ ]
}
```

#### 2. Search Autocomplete Suggestions
Provides instant search keyword completions as the user types.
- **Method**: `GET`
- **Path**: `/api/search/suggestions` or `/api/suggestions`
- **Query Parameters**:
  - `q` *(string, required)*: Query prefix (e.g. `belie`).
- **Response**:
```json
{
  "suggestions": [
    "believer",
    "believer imagine dragons",
    "believer remix"
  ]
}
```

#### 3. Trending Search Queries
Returns popular and trending search recommendations categorized by genre, mood, and artist.
- **Method**: `GET`
- **Path**: `/api/search/trending` or `/api/trending`
- **Response**:
```json
{
  "trending": [
    { "label": "Romantic Melodies", "type": "genre", "query": "genre:romantic" },
    { "label": "Arijit Singh", "type": "artist", "query": "artist:\"Arijit Singh\"" },
    { "label": "Punjabi Bangers", "type": "genre", "query": "genre:punjabi" },
    { "label": "Diljit Dosanjh", "type": "artist", "query": "artist:\"Diljit Dosanjh\"" },
    { "label": "Chill Lo-Fi", "type": "mood", "query": "mood:chill lofi" }
  ]
}
```

---

### Music, Streams & Content

#### 1. Home Feed
Fetches the main catalog home feed consisting of New Releases, Trending Hits (cached for 30 minutes for performance), and Trending Artists.
- **Method**: `GET`
- **Path**: `/api/home`
- **Query Parameters**:
  - `user_id` *(string, optional)*: User ID.
  - `force` *(boolean, optional)*: Force refresh the feed cache (`true` / `false`).
- **Response**:
```json
{
  "sections": [
    {
      "id": "new_releases",
      "title": "New Releases",
      "type": "songs",
      "items": [ /* Track Objects */ ]
    },
    {
      "id": "trending_now",
      "title": "Trending Now",
      "type": "songs",
      "items": [ /* Track Objects */ ]
    },
    {
      "id": "trending_artists",
      "title": "Trending Artists",
      "type": "artists",
      "items": [ /* Artist Objects */ ]
    }
  ]
}
```

#### 2. Personalized Feed
Returns a recommendation feed for the user.
- **Method**: `GET`
- **Path**: `/api/feed/personalized` or `/api/feed`
- **Query Parameters**:
  - `user_id` *(string, optional)*: The user's ID.
- **Response**:
```json
{
  "sections": [ /* Personalized sections */ ],
  "personalized": false
}
```

#### 3. Stream URL (Audio Decryption)
Decrypts the proprietary JioSaavn media token into a direct, high-quality audio stream link (upgraded to 320 kbps MP4/AAC over HTTPS).
- **Method**: `GET`
- **Path**: `/api/stream/{videoId}`
- **URL Parameters**:
  - `videoId` *(string, required)*: The song's Saavn ID (e.g. `cABk3-eP`).
- **Response**:
```json
{
  "stream_url": "https://aac.saavncdn.com/123/xyz_320.mp4",
  "videoId": "cABk3-eP",
  "id": "cABk3-eP",
  "duration": 245
}
```

#### 4. Track Details
Retrieves complete normalized metadata for a single song.
- **Method**: `GET`
- **Path**: `/api/track/{videoId}`
- **URL Parameters**:
  - `videoId` *(string, required)*: The track ID.
- **Response**: Full [Track Object](#1-track-object-song).

#### 5. Track Image
Gets the highest quality artwork URL for a specific track.
- **Method**: `GET`
- **Path**: `/api/track/{videoId}/image` or `/api/track/image/{videoId}`
- **Response**:
```json
{
  "image": "https://c.saavncdn.com/123/xyz_500x500.jpg",
  "id": "cABk3-eP"
}
```

#### 6. Album Details
Retrieves metadata and all tracks belonging to an album.
- **Method**: `GET`
- **Path**: `/api/album/{albumId}`
- **URL Parameters**:
  - `albumId` *(string, required)*: Album ID (with or without `saavn_` prefix).
- **Response**: Full [Album Object](#3-album-object-album).

#### 7. JioSaavn Playlist Details
Retrieves public playlist information and tracks from JioSaavn's catalog.
- **Method**: `GET`
- **Path**: `/api/playlist/{playlistId}`
- **URL Parameters**:
  - `playlistId` *(string, required)*: Playlist ID.
- **Response**: Full [Playlist Object](#4-playlist-object-playlist).

#### 8. Image Proxy
Proxies third-party artwork with persistent caching headers and open CORS headers to prevent cross-origin canvas security errors.
- **Method**: `GET`
- **Path**: `/api/proxy-image` or `/api/image-proxy`
- **Query Parameters**:
  - `url` *(string, required)*: Target image URL to proxy.
- **Response**: Binary image stream (`image/jpeg`, `image/png`, etc.) with `Cache-Control: public, max-age=86400`.

---

### Artists

#### 1. Search Artists
- **Method**: `GET`
- **Path**: `/api/artists/search`
- **Query Parameters**:
  - `q` *(string, required)*: Artist name query.
  - `limit` *(integer, optional, default: `10`)*: Number of results.
- **Response**:
```json
{
  "artists": [ /* Array of Artist Objects */ ],
  "results": [ /* Array of Artist Objects */ ]
}
```

#### 2. Popular Artists
- **Method**: `GET`
- **Path**: `/api/artists/popular`
- **Query Parameters**:
  - `lang` *(string, optional, default: `hindi`)*: Language filter (`hindi`, `punjabi`, `english`, etc.).
  - `limit` *(integer, optional, default: `20`)*: Maximum count.
- **Response**:
```json
{
  "artists": [ /* Array of Artist Objects */ ],
  "results": [ /* Array of Artist Objects */ ]
}
```

#### 3. Batch Artist Images
Fetches high-res profile images for multiple artists in a single round-trip.
- **Method**: `POST`
- **Path**: `/api/artists/batch-images`
- **Request Body**:
```json
{
  "artists": ["Arijit Singh", "Shreya Ghoshal", "Diljit Dosanjh"]
}
```
- **Response**:
```json
{
  "images": {
    "Arijit Singh": "https://c.saavncdn.com/artists/Arijit_Singh_500x500.jpg",
    "Shreya Ghoshal": "https://c.saavncdn.com/artists/Shreya_Ghoshal_500x500.jpg",
    "Diljit Dosanjh": "https://c.saavncdn.com/artists/Diljit_Dosanjh_500x500.jpg"
  }
}
```

#### 4. Artist Songs (Paginated & Curated)
Retrieves an artist's songs using intelligent partitioning: the first batch provides curated top hits, followed by search-backed tracks with strict server-side title and ID deduplication.
- **Method**: `GET`
- **Path**: `/api/artist/{id}/songs`
- **URL Parameters**:
  - `id` *(string, required)*: Numeric artist ID or artist name.
- **Query Parameters**:
  - `page` *(integer, optional, default: `1`)*: Page number.
  - `limit` *(integer, optional, default: `20`, max: `50`)*: Items per page.
- **Response**:
```json
{
  "tracks": [ /* Array of Track Objects */ ],
  "results": [ /* Array of Track Objects */ ],
  "has_more": true,
  "artist": { /* Artist Object */ },
  "page": 1,
  "total": 20
}
```

#### 5. Artist Image
- **Method**: `GET`
- **Path**: `/api/artist/{id}/image`
- **Response**:
```json
{
  "image": "https://c.saavncdn.com/artists/Arijit_Singh_500x500.jpg",
  "id": "459320"
}
```

#### 6. Related Artists
- **Method**: `GET`
- **Path**: `/api/artist/{id}/related`
- **Query Parameters**:
  - `limit` *(integer, optional, default: `10`)*.
- **Response**:
```json
{
  "artists": [ /* Array of Artist Objects */ ],
  "related": [ /* Array of Artist Objects */ ]
}
```

#### 7. Full Artist Profile & Stats
Fetches complete artist biography, listener statistics, top songs, and similar artists.
- **Method**: `GET`
- **Path**: `/api/artist/{id}/info`
- **Response**:
```json
{
  "artist": {
    "id": "459320",
    "name": "Arijit Singh",
    "image": "https://c.saavncdn.com/artists/Arijit_Singh_500x500.jpg",
    "thumbnail": "https://c.saavncdn.com/artists/Arijit_Singh_500x500.jpg",
    "type": "artist",
    "follower_count": 48291029,
    "monthly_listeners": 15200392,
    "bio": "Arijit Singh is an Indian playback singer and music composer...",
    "fan_count": 48291029
  },
  "top_songs": [ /* Array of Track Objects */ ],
  "similar_artists": [ /* Array of Artist Objects */ ],
  "top_songs_count": 50
}
```

---

### Lyrics Service

#### 1. Fetch Synced & Plain Lyrics
Fetches time-synced lyrics from LRCLIB. If exact match fails, it falls back to fuzzy title and artist search.
- **Method**: `GET`
- **Path**: `/api/lyrics`
- **Query Parameters**:
  - `title` *(string, required)*: Song title.
  - `artist` *(string, optional)*: Artist name.
  - `video_id` *(string, optional)*: Saavn song ID.
- **Response**:
```json
{
  "has_lyrics": true,
  "is_synced": true,
  "synced_lyrics": [
    { "time": 14.52, "text": "Mujhko barsaat bana lo" },
    { "time": 19.80, "text": "Dheere dheere se beh lo" }
  ],
  "plain_lyrics": "Mujhko barsaat bana lo\nDheere dheere se beh lo\n...",
  "plainLyrics": "Mujhko barsaat bana lo\nDheere dheere se beh lo\n...",
  "syncedLyrics": "[00:14.52] Mujhko barsaat bana lo\n[00:19.80] Dheere dheere se beh lo\n...",
  "instrumental": false
}
```

---

### Authentication

#### 1. PIN Authentication & Auto-Registration
Authenticate existing users or automatically register a new user profile with a 4-digit PIN.
- **Method**: `POST`
- **Path**: `/api/auth/pin`
- **Request Body**:
```json
{
  "username": "alex",
  "pin": "1234"
}
```
- **Response (New User)**:
```json
{
  "success": true,
  "user": {
    "uid": "pin_alex_l9x1z8a",
    "displayName": "Alex"
  },
  "isNewUser": true
}
```
- **Response (Existing User)**:
```json
{
  "success": true,
  "user": {
    "uid": "pin_alex_l9x1z8a",
    "displayName": "Alex"
  },
  "isNewUser": false
}
```

#### 2. Phone Authentication
Placeholder endpoint for SMS-based phone OTP authentication.
- **Method**: `POST`
- **Path**: `/api/auth/phone`
- **Status**: Returns `HTTP 501 Not Implemented` (*Requires SMS provider setup*).

---

### User Profile, History & Favorites

#### 1. User Onboarding
Saves music language preferences and favorite artists during initial user onboarding.
- **Method**: `POST`
- **Path**: `/api/user/onboard`
- **Request Body**:
```json
{
  "user_id": "user_12345",
  "username": "alex",
  "languages": ["hindi", "punjabi", "english"],
  "favoriteArtists": ["Arijit Singh", "Diljit Dosanjh", "The Weeknd"]
}
```
- **Response**:
```json
{ "success": true }
```

#### 2. Get User Profile
- **Method**: `GET`
- **Path**: `/api/user/profile?user_id={userId}`
- **Response**:
```json
{
  "username": "alex",
  "displayName": "alex",
  "name": "alex",
  "languages": ["hindi", "punjabi", "english"],
  "favoriteArtists": ["Arijit Singh", "Diljit Dosanjh"],
  "updatedAt": "2026-03-13T20:40:00+05:30"
}
```

#### 3. Record Playback
Logs track playback into the user's history and increments stream counters.
- **Method**: `POST`
- **Path**: `/api/play/record`
- **Request Body**:
```json
{
  "user_id": "user_12345",
  "videoId": "cABk3-eP",
  "title": "Kesariya",
  "artist": "Arijit Singh",
  "album": "Brahmastra",
  "image": "https://c.saavncdn.com/...",
  "duration": 268
}
```
- **Response**:
```json
{ "success": true }
```

#### 4. Get Listening History & Stats
Retrieves the last 50 recently played songs and listening metrics.
- **Method**: `GET`
- **Path**: `/api/history?user_id={userId}`
- **Response**:
```json
{
  "recent": [ /* Up to 50 Track Objects */ ],
  "stats": {
    "streamCount": 142
  }
}
```

#### 5. Toggle Favorite
Adds or removes a track from the user's liked songs.
- **Method**: `POST`
- **Path**: `/api/favorites/toggle`
- **Request Body**:
```json
{
  "user_id": "user_12345",
  "videoId": "cABk3-eP",
  "title": "Kesariya",
  "artist": "Arijit Singh",
  "album": "Brahmastra",
  "thumbnail": "https://c.saavncdn.com/...",
  "duration": 268
}
```
- **Response**:
```json
{ "favorited": true }
```
*(If already favorited, it will remove it and return `{"favorited": false}`)*

#### 6. Get Favorites
- **Method**: `GET`
- **Path**: `/api/favorites?user_id={userId}`
- **Response**:
```json
{
  "favorites": [ /* Array of Liked Track Objects */ ]
}
```

---

### Playlists & Community

#### 1. Public & Community Playlists
Aggregates trending community hits dynamically generated from all users' real listening histories alongside user-created public playlists.
- **Method**: `GET`
- **Path**: `/api/playlists/public`
- **Response**:
```json
[
  {
    "id": "public_pl_community_top",
    "name": "Staytup Community Top Tracks",
    "description": "Real-time trending hits based on all Staytup user listening histories.",
    "cover_url": "https://c.saavncdn.com/...",
    "is_public": true,
    "isPublic": true,
    "type": "public",
    "creator_name": "Staytup Community",
    "track_count": 30,
    "tracks": [ /* Array of Track Objects */ ]
  }
]
```

#### 2. Get User Playlists
- **Method**: `GET`
- **Path**: `/api/playlists?user_id={userId}`
- **Response**: Array of Playlist Objects.

#### 3. Create Playlist
- **Method**: `POST`
- **Path**: `/api/playlists/create`
- **Request Body**:
```json
{
  "user_id": "user_12345",
  "name": "Late Night Vibes",
  "description": "Soft chill tracks",
  "cover_url": "https://images.unsplash.com/...",
  "tracks": [ /* Array of Track Objects */ ]
}
```
- **Response**:
```json
{
  "playlist": {
    "id": "pl_1710342000_f9a8b7c6",
    "name": "Late Night Vibes",
    "description": "Soft chill tracks",
    "cover_url": "https://images.unsplash.com/...",
    "tracks": [],
    "track_count": 0,
    "created_at": "2026-03-13T20:45:00+05:30"
  }
}
```

#### 4. Get Playlist Details
Supports both user-created playlist IDs (`pl_*`) and Saavn playlists (`saavn_*`).
- **Method**: `GET`
- **Path**: `/api/playlists/{playlistId}?user_id={userId}`
- **Response**:
```json
{
  "playlist": { /* Playlist Object */ }
}
```

#### 5. Update Playlist Metadata
- **Method**: `PUT`
- **Path**: `/api/playlists/{playlistId}?user_id={userId}`
- **Request Body**:
```json
{
  "name": "Updated Playlist Name",
  "description": "New description",
  "cover_url": "https://..."
}
```
- **Response**:
```json
{ "success": true }
```

#### 6. Delete Playlist
- **Method**: `DELETE`
- **Path**: `/api/playlists/{playlistId}?user_id={userId}`
- **Response**:
```json
{ "success": true }
```

#### 7. Add Track to Playlist
- **Method**: `POST`
- **Path**: `/api/playlists/{playlistId}/tracks?user_id={userId}`
- **Request Body**:
```json
{
  "track": { /* Track Object */ }
}
```
- **Response**:
```json
{ "success": true }
```

#### 8. Remove Track from Playlist
- **Method**: `DELETE`
- **Path**: `/api/playlists/{playlistId}/tracks/{videoId}?user_id={userId}`
- **Response**:
```json
{ "success": true }
```

---

### Referral Program

#### 1. Generate Referral Code
Generates a unique 8-character alphanumeric referral code for the user.
- **Method**: `POST`
- **Path**: `/api/referral/create`
- **Request Body**:
```json
{
  "user_id": "user_12345"
}
```
- **Response**:
```json
{
  "code": "A9K2M7X1"
}
```

#### 2. Claim Referral Code
- **Method**: `POST`
- **Path**: `/api/referral/claim`
- **Request Body**:
```json
{
  "user_id": "user_67890",
  "code": "A9K2M7X1"
}
```
- **Response**:
```json
{ "success": true }
```
*(Prevents self-referral and duplicate claims)*

#### 3. Referral Stats
- **Method**: `GET`
- **Path**: `/api/referral/stats?user_id={userId}`
- **Response**:
```json
{
  "count": 4,
  "code": "A9K2M7X1"
}
```

---

### Premium & Subscriptions

#### 1. Save Premium Status
Records active subscription status and payment gateway metadata (e.g. Razorpay).
- **Method**: `POST`
- **Path**: `/api/premium/save`
- **Request Body**:
```json
{
  "user_id": "user_12345",
  "plan": "Annual Pro",
  "is_premium": true,
  "payment_details": {
    "gateway": "razorpay",
    "payment_id": "pay_O7d01k29smK",
    "order_id": "order_O7d091ks"
  }
}
```
- **Response**:
```json
{ "success": true }
```

---

### Playlist Importers (YouTube & Spotify)

Import entire playlists from YouTube or Spotify links into Staytup.

#### 1. Unified / Platform Import
- **Method**: `POST`
- **Paths**:
  - `/api/youtube/import`
  - `/api/spotify/import`
  - `/api/import`
- **Request Body**:
```json
{
  "url": "https://www.youtube.com/playlist?list=PL4fGSIFgk54Gq2f-9vH4Z2nQY9mN4o-9g"
}
```
*or*
```json
{
  "url": "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
}
```

##### ⚡ YouTube Importer Capabilities
- Parses both modern YouTube lockup models (`lockupViewModel`) and legacy renderers (`playlistVideoRenderer`).
- Automatically extracts `INNERTUBE_API_KEY` and continuation tokens to iterate through pagination batches with HTTP keep-alive, importing playlists up to **5,000+ tracks** (bypasses default 100-song limit).
- Cleans and strips UI artifacts (e.g., keyboard shortcuts, descriptions).

##### ⚡ Spotify Importer Capabilities
- Queries oEmbed metadata and inspects Next.js embedded hydration state (`__NEXT_DATA__` and `data-initial-page-data`).
- Resolves track titles and artist names for seamless in-app search mapping.

- **Response**:
```json
{
  "success": true,
  "source": "youtube",
  "playlist": {
    "name": "Global Top Hits",
    "tracks": [
      {
        "title": "Blinding Lights",
        "artist": "The Weeknd",
        "videoId": "4NRXx6U8ABQ"
      }
    ],
    "track_count": 1
  }
}
```

---

## 🛑 Error Handling

The API returns standard HTTP status codes and structured JSON errors:

```json
{
  "error": "Error description message"
}
```

### Common HTTP Status Codes
| Status Code | Meaning | Description |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Request succeeded and JSON payload returned. |
| **`204 No Content`** | Preflight Success | Returned for `OPTIONS` CORS preflights. |
| **`400 Bad Request`** | Validation Error | Missing required fields, invalid parameters, or bad format. |
| **`401 Unauthorized`** | Authentication Required | Missing credentials or invalid PIN. |
| **`404 Not Found`** | Resource Not Found | Endpoint, track, album, or playlist not found. |
| **`405 Method Not Allowed`** | Verb Mismatch | Request method (GET/POST/PUT/DELETE) is disallowed. |
| **`500 Internal Server Error`** | Server Error | Uncaught server exception (logged to PHP `error_log`). |
| **`501 Not Implemented`** | Feature Pending | Endpoint requires third-party credentials (SMS provider). |
| **`502 Bad Gateway`** | Upstream Error | Third-party upstream service (JioSaavn/YouTube/Spotify) was unreachable or returned invalid response. |

---

## 💾 Storage Architecture & Production Migration

By default, the backend stores state in local JSON files inside `data/`:
```
data/
├── pin_users/          # PIN auth users: <cleanUsername>.json
├── referrals/          # Referral mappings: code_<CODE>.json & user_<UID>.json
├── public/             # Public & community generated playlists
└── users/
    └── <userId>/
        ├── profile.json            # User profile and onboard preferences
        ├── favorites.json          # Liked tracks
        ├── playlists.json          # Custom user playlists
        ├── recently_played.json    # Up to 50 recent streams
        ├── stats.json              # Aggregate playback stats
        ├── folders.json            # Playlist organization folders
        ├── albums.json             # Saved/bookmarked albums
        └── premium.json            # Active subscription data
```

### Upgrading to MySQL or Firebase
All database actions are centralized in [`api/utils/storage.php`](file:///Users/animikh/Downloads/staytup/api/utils/storage.php). To migrate to MySQL or Firebase Realtime Database:
1. Retain the static signatures on the `Storage` class (e.g. `Storage::getUserProfile`, `Storage::toggleFavorite`).
2. Replace the `readJson` and `writeJson` methods with PDO queries or Firebase REST API calls.

---

## ⚙️ Configuration & Environment

Settings are located in [`api/config/config.php`](file:///Users/animikh/Downloads/staytup/api/config/config.php):

| Constant | Default Value | Description |
| :--- | :--- | :--- |
| `APP_NAME` | `'Staytup Music'` | Application name |
| `APP_VERSION` | `'2.8.1'` | Current API version |
| `JIOSAAVN_API` | `'https://www.jiosaavn.com/api.php'` | Upstream JioSaavn API gateway |
| `JIOSAAVN_API_VERSION` | `4` | JioSaavn API protocol version |
| `JIOSAAVN_CTX` | `'web6dot0'` | JioSaavn web client context |
| `STREAM_DECRYPT_KEY` | `'38346591'` | 8-byte DES decryption key for media URLs |
| `LRCLIB_API` | `'https://lrclib.net/api'` | LRCLIB base endpoint for lyrics |
| `FIREBASE_DB_URL` | `'https://staytupnow-default-rtdb.firebaseio.com'` | Firebase RTDB endpoint |
| `RAZORPAY_KEY_ID` | `'rzp_test_TYGML4eKY8GLxv'` | Razorpay payment key |
| `DEFAULT_SEARCH_LIMIT`| `40` | Default track search page size |
| `DEFAULT_ARTIST_LIMIT`| `10` | Default artist search page size |
| `ALLOWED_ORIGINS` | `'*'` | Allowed CORS origins |
