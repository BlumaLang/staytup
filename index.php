<?php
/**
 * Staytup Music — Front Controller & SPA Shell Server
 * Routes /api/* to the PHP backend.
 * Serves static Vite assets and routes all client-side pages to dist/index.html.
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
    'js'   => 'application/javascript',
    'css'  => 'text/css',
    'json' => 'application/json',
    'webmanifest' => 'application/manifest+json',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'svg'  => 'image/svg+xml',
    'ico'  => 'image/x-icon',
    'woff' => 'font/woff',
    'woff2'=> 'font/woff2',
    'ttf'  => 'font/ttf'
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

// Manifest handler
if ($route === '/manifest.json' || $route === '/manifest.webmanifest') {
    header('Content-Type: application/manifest+json');
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
    $swFile = __DIR__ . '/dist' . $route;
    if (file_exists($swFile)) {
        readfile($swFile);
        exit;
    }
}

// ==================== 3. SPA CLIENT-SIDE FALLBACK ====================
// Serve dist/index.html for all frontend routes with dynamic base href
$indexHtml = __DIR__ . '/dist/index.html';
if (file_exists($indexHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    $content = file_get_contents($indexHtml);
    $baseHref = ($basePath ?: '') . '/';
    $content = preg_replace('/<head>/i', "<head>\n    <base href=\"{$baseHref}\" />", $content, 1);
    echo $content;
    exit;
}

echo "Staytup Music build not found. Please run 'npm run build'.";
