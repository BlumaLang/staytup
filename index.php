<?php
/**
 * Staytup Music — Front Controller & SPA Shell Server
 * Routes /api/* to the PHP backend.
 * Serves static Vite assets, injects Open Graph meta tags for deep links,
 * and routes all client-side pages to dist/index.html.
 */

// Detect base path reliably
$basePath = '';
if (!empty($_SERVER['SCRIPT_NAME']) && preg_match('#^(.*)/index\.php#i', $_SERVER['SCRIPT_NAME'], $m)) {
    $basePath = $m[1];
} elseif (!empty($_SERVER['DOCUMENT_ROOT']) && realpath(__DIR__) !== realpath($_SERVER['DOCUMENT_ROOT'])) {
    $docRoot = realpath($_SERVER['DOCUMENT_ROOT']);
    $dir = realpath(__DIR__);
    if ($docRoot && $dir && strpos($dir, $docRoot) === 0) {
        $basePath = str_replace('\\', '/', substr($dir, strlen($docRoot)));
    }
}
$basePath = rtrim($basePath, '/');

// Parse request URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');

// Remove base path prefix
if ($basePath !== '' && strpos($uri, $basePath) === 0) {
    $route = substr($uri, strlen($basePath));
} else {
    $route = $uri;
}
$route = '/' . ltrim($route, '/');

// ==================== 1. API ROUTES ====================
if (preg_match('#^/api(/|$)#i', $route) || preg_match('#/api(/|$)#i', $uri)) {
    require_once __DIR__ . '/api/index.php';
    exit;
}

// ==================== 2. STATIC FILES ====================
$mimeTypes = [
    'js'          => 'application/javascript',
    'css'         => 'text/css',
    'json'        => 'application/json',
    'webmanifest' => 'application/manifest+json',
    'png'         => 'image/png',
    'jpg'         => 'image/jpeg',
    'jpeg'        => 'image/jpeg',
    'svg'         => 'image/svg+xml',
    'ico'         => 'image/x-icon',
    'woff'        => 'font/woff',
    'woff2'       => 'font/woff2',
    'ttf'         => 'font/ttf'
];

$cleanPath = ltrim($route, '/');
$candidates = [
    __DIR__ . '/dist/' . $cleanPath,
    __DIR__ . '/public/' . $cleanPath,
    __DIR__ . '/' . $cleanPath
];

foreach ($candidates as $filePath) {
    if (!empty($cleanPath) && file_exists($filePath) && !is_dir($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if (isset($mimeTypes[$ext])) {
            header('Content-Type: ' . $mimeTypes[$ext]);
        }
        header('Access-Control-Allow-Origin: *');
        readfile($filePath);
        exit;
    }
}

// Version endpoint for zero-latency push & update detection
if ($route === '/version.json') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    $verFile = file_exists(__DIR__ . '/dist/version.json') 
        ? __DIR__ . '/dist/version.json' 
        : __DIR__ . '/public/version.json';
    if (file_exists($verFile)) {
        readfile($verFile);
    } else {
        $mtime = filemtime(__FILE__);
        echo json_encode([
            'version' => '1.0.0',
            'buildId' => 'build_' . $mtime,
            'buildTime' => $mtime * 1000,
            'builtAt' => date('c', $mtime)
        ]);
    }
    exit;
}

// Manifest handler
if ($route === '/manifest.json' || $route === '/manifest.webmanifest') {
    header('Content-Type: application/manifest+json');
    header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    $manifestFile = file_exists(__DIR__ . '/dist/manifest.webmanifest') 
        ? __DIR__ . '/dist/manifest.webmanifest' 
        : __DIR__ . '/public/manifest.json';
    if (file_exists($manifestFile)) {
        readfile($manifestFile);
        exit;
    }
}

// Service worker handler
if (in_array($route, ['/sw.js', '/service-worker.js', '/registerSW.js'])) {
    header('Content-Type: application/javascript');
    header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('Service-Worker-Allowed: /');
    $swFile = file_exists(__DIR__ . '/dist' . $route) 
        ? __DIR__ . '/dist' . $route 
        : __DIR__ . '/public/sw.js';
    if (file_exists($swFile)) {
        readfile($swFile);
        exit;
    }
}

// ==================== 3. SPA CLIENT-SIDE FALLBACK WITH OPEN GRAPH METADATA ====================
$indexHtml = __DIR__ . '/dist/index.html';
if (file_exists($indexHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    $content = file_get_contents($indexHtml);
    $baseHref = ($basePath ?: '') . '/';

    // Default metadata
    $metaTitle = "Staytup Music — Sound Without Limits";
    $metaDesc = "Fast, ad-free music streaming platform with synchronized lyrics, trending hits, and social listening.";
    $metaImage = "https://staytupnow.web.app/icon.png";
    $metaUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];

    // Check for song deep link: /song/:id or /track/:id
    if (preg_match('#^/(?:song|track)/([a-zA-Z0-9_\-]+)#i', $route, $m)) {
        $songId = $m[1];
        if (file_exists(__DIR__ . '/api/services/jiosaavn.php')) {
            try {
                require_once __DIR__ . '/api/services/jiosaavn.php';
                $cleanId = preg_replace('/^saavn_/', '', $songId);
                $track = JioSaavnService::getTrackDetails($cleanId);
                if ($track && !empty($track['title'])) {
                    $metaTitle = htmlspecialchars($track['title'] . ' - ' . $track['artist'] . ' | Staytup Music');
                    $metaDesc = htmlspecialchars('Listen to ' . $track['title'] . ' by ' . $track['artist'] . ' on Staytup Music.');
                    if (!empty($track['image'])) {
                        $metaImage = htmlspecialchars($track['image']);
                    }
                }
            } catch (\Throwable $e) {}
        }
    } elseif (preg_match('#^/artist/([^/]+)#i', $route, $m)) {
        $artistName = urldecode($m[1]);
        $metaTitle = htmlspecialchars($artistName . ' — Music, Songs & Albums | Staytup');
        $metaDesc = htmlspecialchars('Listen to top hits, albums, and popular tracks by ' . $artistName . ' on Staytup Music.');
    } elseif (preg_match('#^/album/([^/]+)#i', $route, $m)) {
        $albumId = urldecode($m[1]);
        $metaTitle = htmlspecialchars('Album ' . $albumId . ' | Staytup Music');
    } elseif (preg_match('#^/playlist/([^/]+)#i', $route, $m)) {
        $playlistId = urldecode($m[1]);
        $metaTitle = htmlspecialchars('Playlist ' . $playlistId . ' | Staytup Music');
    } elseif (preg_match('#^/user/([^/]+)#i', $route, $m)) {
        $userId = urldecode($m[1]);
        $metaTitle = htmlspecialchars($userId . ' — Listener Profile | Staytup Music');
        $metaDesc = htmlspecialchars('Check out ' . $userId . '\'s music profile, playlists, and listening activity on Staytup.');
    } elseif (preg_match('#^/blend/invite/([^/]+)#i', $route, $m)) {
        $token = urldecode($m[1]);
        $metaTitle = htmlspecialchars('Join Shared Music Blend | Staytup');
        $metaDesc = htmlspecialchars('You are invited to join a shared music Blend on Staytup! Combine tastes and generate your shared daily mix.');
    } elseif (preg_match('#^/blend(?:/([^/]+))?#i', $route, $m)) {
        $metaTitle = htmlspecialchars('Blend — Shared Daily Music Mix | Staytup');
        $metaDesc = htmlspecialchars('A personalized daily shared music mix combining listening profiles on Staytup.');
    }

    // Dynamic metadata tags
    $injectedTags = <<<HTML
    <base href="{$baseHref}" />
    <title>{$metaTitle}</title>
    <meta property="og:title" content="{$metaTitle}" />
    <meta property="og:description" content="{$metaDesc}" />
    <meta property="og:image" content="{$metaImage}" />
    <meta property="og:url" content="{$metaUrl}" />
    <meta property="og:type" content="music.song" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{$metaTitle}" />
    <meta name="twitter:description" content="{$metaDesc}" />
    <meta name="twitter:image" content="{$metaImage}" />
HTML;

    $content = preg_replace('/<title>.*?<\/title>/i', '', $content, 1);
    $content = preg_replace('/<head>/i', "<head>\n" . $injectedTags, $content, 1);

    echo $content;
    exit;
}

echo "Staytup Music build not found. Please run 'npm run build'.";
