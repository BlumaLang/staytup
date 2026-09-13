<?php
/**
 * Playlist Import Routes - Spotify
 */

require_once __DIR__ . '/../utils/http.php';
require_once __DIR__ . '/../utils/response.php';

class ImportRoutes {

    public static function handle($action, $method) {
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }

        $body = getRequestBody();
        $url = trim($body['url'] ?? '');

        if (empty($url)) {
            sendError('URL is required');
        }

        $isSpotify = strpos($url, 'spotify.com/playlist/') !== false || strpos($url, 'spotify:playlist:') !== false;

        if (!$isSpotify) {
            sendError('Please provide a valid Spotify playlist link.');
        }

        return self::importSpotify($url);
    }

    // ─── Spotify Playlist Import ──────────────────────────────────────────
    private static function importSpotify($url) {
        // Extract playlist ID from URL
        $playlistId = self::extractSpotifyPlaylistId($url);
        if (!$playlistId) {
            sendError('Could not extract Spotify playlist ID from URL.');
        }

        // Try Spotify oEmbed API (public, no auth needed)
        $oembedUrl = "https://open.spotify.com/oembed?url=" . urlencode("https://open.spotify.com/playlist/" . $playlistId);
        $oembedResult = httpGet($oembedUrl);

        $playlistName = 'Spotify Playlist';
        if ($oembedResult['code'] === 200) {
            $oembed = json_decode($oembedResult['data'], true);
            $playlistName = $oembed['title'] ?? 'Spotify Playlist';
        }

        // Fetch the Spotify embed page to get track listing
        $embedUrl = "https://open.spotify.com/embed/playlist/" . $playlistId;
        $result = httpGet($embedUrl, [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept: text/html',
        ]);

        $tracks = [];

        if ($result['code'] === 200) {
            $html = $result['data'];

            // Method 1: Extract from embedded JSON data
            if (preg_match('/<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s', $html, $m)) {
                $data = json_decode($m[1], true);
                if ($data) {
                    $tracks = self::parseSpotifyNextData($data);
                }
            }

            // Method 2: Extract from data-initial-page-data attribute
            if (empty($tracks) && preg_match('/data-initial-page-data="([^"]+)"/', $html, $m)) {
                $decoded = html_entity_decode($m[1], ENT_QUOTES, 'UTF-8');
                $data = json_decode($decoded, true);
                if ($data) {
                    $tracks = self::parseSpotifyNextData($data);
                }
            }

            // Method 3: Extract track info from meta tags and structured data
            if (empty($tracks)) {
                preg_match_all('/<meta[^>]*content="([^"]*)"[^>]*>/i', $html, $metaMatches);
                // Look for track names in the page content
                preg_match_all('/"name"\s*:\s*"([^"]+)"/', $html, $nameMatches);
                preg_match_all('/"artists?"?\s*:\s*\[?\{[^}]*"name"\s*:\s*"([^"]+)"/', $html, $artistMatches);

                $names = $nameMatches[1] ?? [];
                $artists = $artistMatches[1] ?? [];

                for ($i = 0; $i < count($names); $i++) {
                    $tracks[] = [
                        'title' => html_entity_decode($names[$i], ENT_QUOTES, 'UTF-8'),
                        'artist' => isset($artists[$i]) ? html_entity_decode($artists[$i], ENT_QUOTES, 'UTF-8') : '',
                    ];
                }
            }
        }

        // Fallback: Use Spotify Web API (no auth needed for public playlists via embed)
        if (empty($tracks)) {
            // Try the public Spotify API endpoint for playlist preview
            $apiUrl = "https://api.spotify.com/v1/playlists/{$playlistId}/tracks?limit=100&market=US";
            $apiResult = httpGet($apiUrl, [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept: application/json',
            ]);

            if ($apiResult['code'] === 200) {
                $apiData = json_decode($apiResult['data'], true);
                foreach ($apiData['items'] ?? [] as $item) {
                    $track = $item['track'] ?? null;
                    if (!$track) continue;
                    $tracks[] = [
                        'title' => $track['name'] ?? '',
                        'artist' => implode(', ', array_map(fn($a) => $a['name'] ?? '', $track['artists'] ?? [])),
                    ];
                }
            }
        }

        if (empty($tracks)) {
            sendError('Could not parse Spotify playlist. It may be private or the format is unsupported.', 502);
        }

        sendJson([
            'success' => true,
            'source' => 'spotify',
            'playlist' => [
                'name' => $playlistName,
                'tracks' => $tracks,
                'track_count' => count($tracks),
            ],
        ]);
    }

    private static function parseSpotifyNextData($data) {
        $tracks = [];

        // Navigate through the Next.js data structure
        $pageProps = $data['props']['pageProps'] ?? $data;
        $state = $pageProps['state']['data'] ?? $pageProps['data'] ?? null;

        if (!$state) {
            $state = $data['props']['initialState'] ?? null;
        }

        if (!$state) return [];

        // Modern Spotify Embed format (2024-2026): entity.trackList
        $entity = $state['entity'] ?? null;
        if ($entity && !empty($entity['trackList'])) {
            foreach ($entity['trackList'] as $item) {
                $title = $item['title'] ?? $item['name'] ?? '';
                $artist = $item['subtitle'] ?? '';
                if (!empty($title)) {
                    $tracks[] = [
                        'title' => html_entity_decode($title, ENT_QUOTES, 'UTF-8'),
                        'artist' => html_entity_decode($artist, ENT_QUOTES, 'UTF-8'),
                    ];
                }
            }
            if (!empty($tracks)) return $tracks;
        }

        // Classic format: playlist.tracks.items
        $playlist = $state['playlist'] ?? $state['playlistData'] ?? null;
        if ($playlist) {
            $items = $playlist['tracks']['items'] ?? $playlist['items'] ?? [];
            foreach ($items as $item) {
                $track = $item['track'] ?? $item;
                if (!$track) continue;
                $tracks[] = [
                    'title' => $track['name'] ?? '',
                    'artist' => implode(', ', array_map(fn($a) => $a['name'] ?? '', $track['artists'] ?? [])),
                ];
            }
        }

        return $tracks;
    }

    private static function extractSpotifyPlaylistId($url) {
        // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
        if (preg_match('/playlist\/([a-zA-Z0-9]+)/', $url, $m)) {
            return $m[1];
        }
        // spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
        if (preg_match('/spotify:playlist:([a-zA-Z0-9]+)/', $url, $m)) {
            return $m[1];
        }
        return null;
    }
}
