<?php
/**
 * Local JSON File Storage
 * Simple file-based storage for user data.
 * For production, replace with Firebase Admin SDK or MySQL.
 */

class Storage {
    
    private static $dataDir = null;
    
    private static function getDataDir() {
        if (self::$dataDir === null) {
            self::$dataDir = __DIR__ . '/../../data';
            if (!is_dir(self::$dataDir)) {
                mkdir(self::$dataDir, 0755, true);
            }
        }
        return self::$dataDir;
    }
    
    private static function getUserDir($userId) {
        $dir = self::getDataDir() . '/users/' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $userId);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }
    
    private static function readJson($path) {
        if (!file_exists($path)) return null;
        $content = file_get_contents($path);
        return json_decode($content, true);
    }
    
    private static function writeJson($path, $data) {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    // ==================== USER PROFILE ====================
    
    public static function saveUserProfile($userId, $profile) {
        $dir = self::getUserDir($userId);
        self::writeJson($dir . '/profile.json', $profile);
    }
    
    public static function getUserProfile($userId) {
        $dir = self::getUserDir($userId);
        return self::readJson($dir . '/profile.json');
    }
    
    // ==================== RECENTLY PLAYED ====================
    
    public static function addRecentlyPlayed($userId, $track) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/recently_played.json';
        $recent = self::readJson($path) ?? [];
        
        $targetId = $track['videoId'] ?? $track['video_id'] ?? $track['id'] ?? '';
        
        // Remove duplicate if exists (merge by videoId / id)
        if (!empty($targetId)) {
            $recent = array_filter($recent, function($t) use ($targetId) {
                $tid = $t['videoId'] ?? $t['video_id'] ?? $t['id'] ?? '';
                return $tid !== $targetId;
            });
        }
        
        // Add to front
        array_unshift($recent, $track);
        
        // Deduplicate any remaining items by videoId/id
        $unique = [];
        $seen = [];
        foreach ($recent as $t) {
            $id = $t['videoId'] ?? $t['video_id'] ?? $t['id'] ?? '';
            if ($id && !isset($seen[$id])) {
                $seen[$id] = true;
                $unique[] = $t;
            }
        }
        
        // Keep only 50 items
        $unique = array_slice($unique, 0, 50);
        
        self::writeJson($path, array_values($unique));
    }
    
    public static function getRecentlyPlayed($userId) {
        $dir = self::getUserDir($userId);
        $recent = self::readJson($dir . '/recently_played.json') ?? [];
        
        // Ensure deduplication when returning history
        $unique = [];
        $seen = [];
        foreach ($recent as $t) {
            $id = $t['videoId'] ?? $t['video_id'] ?? $t['id'] ?? '';
            if ($id && !isset($seen[$id])) {
                $seen[$id] = true;
                $unique[] = $t;
            }
        }
        return $unique;
    }
    
    // ==================== STREAM COUNT ====================
    
    public static function incrementStreamCount($userId) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/stats.json';
        $stats = self::readJson($path) ?? ['streamCount' => 0];
        $stats['streamCount'] = ($stats['streamCount'] ?? 0) + 1;
        self::writeJson($path, $stats);
    }
    
    public static function getUserStats($userId) {
        $dir = self::getUserDir($userId);
        return self::readJson($dir . '/stats.json') ?? ['streamCount' => 0];
    }
    
    // ==================== FAVORITES ====================
    
    public static function toggleFavorite($userId, $videoId, $track) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/favorites.json';
        $favorites = self::readJson($path) ?? [];
        
        if (isset($favorites[$videoId])) {
            unset($favorites[$videoId]);
            self::writeJson($path, $favorites);
            return false; // Removed
        } else {
            $favorites[$videoId] = $track;
            self::writeJson($path, $favorites);
            return true; // Added
        }
    }
    
    public static function getFavorites($userId) {
        $dir = self::getUserDir($userId);
        $favorites = self::readJson($dir . '/favorites.json') ?? [];
        return array_values($favorites);
    }
    
    // ==================== PLAYLISTS ====================
    
    public static function getPlaylists($userId) {
        $dir = self::getUserDir($userId);
        return self::readJson($dir . '/playlists.json') ?? [];
    }
    
    public static function createPlaylist($userId, $playlist) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/playlists.json';
        $playlists = self::readJson($path) ?? [];
        $playlists[] = $playlist;
        self::writeJson($path, $playlists);
    }
    
    public static function getPlaylist($userId, $playlistId) {
        $playlists = self::getPlaylists($userId);
        foreach ($playlists as $pl) {
            if ($pl['id'] === $playlistId) return $pl;
        }
        return null;
    }
    
    public static function updatePlaylist($userId, $playlistId, $updates) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/playlists.json';
        $playlists = self::readJson($path) ?? [];
        
        foreach ($playlists as &$pl) {
            if ($pl['id'] === $playlistId) {
                $pl = array_merge($pl, $updates);
                break;
            }
        }
        
        self::writeJson($path, $playlists);
    }
    
    public static function deletePlaylist($userId, $playlistId) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/playlists.json';
        $playlists = self::readJson($path) ?? [];
        
        $playlists = array_filter($playlists, fn($pl) => $pl['id'] !== $playlistId);
        self::writeJson($path, array_values($playlists));
    }
    
    public static function addTrackToPlaylist($userId, $playlistId, $track) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/playlists.json';
        $playlists = self::readJson($path) ?? [];
        
        foreach ($playlists as &$pl) {
            if ($pl['id'] === $playlistId) {
                $pl['tracks'][] = $track;
                $pl['track_count'] = count($pl['tracks']);
                break;
            }
        }
        
        self::writeJson($path, $playlists);
    }
    
    public static function removeTrackFromPlaylist($userId, $playlistId, $videoId) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/playlists.json';
        $playlists = self::readJson($path) ?? [];
        
        foreach ($playlists as &$pl) {
            if ($pl['id'] === $playlistId) {
                $pl['tracks'] = array_filter($pl['tracks'], fn($t) => ($t['videoId'] ?? '') !== $videoId);
                $pl['tracks'] = array_values($pl['tracks']);
                $pl['track_count'] = count($pl['tracks']);
                break;
            }
        }
        
        self::writeJson($path, $playlists);
    }
    
    public static function bulkRemoveTracksFromPlaylist($userId, $playlistId, $videoIds) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/playlists.json';
        $playlists = self::readJson($path) ?? [];
        $idSet = array_flip($videoIds);
        
        foreach ($playlists as &$pl) {
            if ($pl['id'] === $playlistId) {
                $pl['tracks'] = array_values(array_filter($pl['tracks'], function($t) use ($idSet) {
                    $vid = $t['videoId'] ?? $t['video_id'] ?? $t['id'] ?? '';
                    return !isset($idSet[$vid]);
                }));
                $pl['track_count'] = count($pl['tracks']);
                break;
            }
        }
        
        self::writeJson($path, $playlists);
    }

    // ==================== ALBUMS ====================

    public static function getSavedAlbums($userId) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/albums.json';
        $albums = self::readJson($path) ?? [];
        return array_values($albums);
    }

    public static function toggleSavedAlbum($userId, $albumId, $albumData) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/albums.json';
        $albums = self::readJson($path) ?? [];

        if (isset($albums[$albumId])) {
            unset($albums[$albumId]);
            self::writeJson($path, $albums);
            return false;
        } else {
            $albums[$albumId] = $albumData;
            self::writeJson($path, $albums);
            return true;
        }
    }

    // ==================== PLAYLIST FOLDERS ====================

    public static function getPlaylistFolders($userId) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/folders.json';
        return self::readJson($path) ?? [];
    }

    public static function savePlaylistFolders($userId, $folders) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/folders.json';
        self::writeJson($path, $folders);
    }

    // ==================== PREMIUM ====================
    
    public static function saveUserPremium($userId, $premium) {
        $dir = self::getUserDir($userId);
        self::writeJson($dir . '/premium.json', $premium);
    }
    
    // ==================== PUBLIC PLAYLISTS ====================

    public static function getPublicPlaylists() {
        $publicDir = self::getDataDir() . '/public';
        if (!is_dir($publicDir)) {
            @mkdir($publicDir, 0777, true);
        }
        $publicPath = $publicDir . '/playlists.json';

        // 1. Gather all user-created public playlists from data/users/*/playlists.json
        $userPublicPlaylists = [];
        $usersDir = self::getDataDir() . '/users';
        if (is_dir($usersDir)) {
            $userFolders = scandir($usersDir);
            foreach ($userFolders as $u) {
                if ($u === '.' || $u === '..') continue;
                $uPlaylistsFile = $usersDir . '/' . $u . '/playlists.json';
                $uPlaylists = self::readJson($uPlaylistsFile);
                if (is_array($uPlaylists)) {
                    foreach ($uPlaylists as $pl) {
                        if (!empty($pl['is_public']) || !empty($pl['isPublic'])) {
                            $userPublicPlaylists[] = array_merge($pl, [
                                'is_public' => true,
                                'isPublic' => true,
                                'type' => 'public',
                            ]);
                        }
                    }
                }
            }
        }

        // 2. Aggregate user listening history from data/users/*/recently_played.json
        $historyTracksMap = [];
        if (is_dir($usersDir)) {
            $userFolders = scandir($usersDir);
            foreach ($userFolders as $u) {
                if ($u === '.' || $u === '..') continue;
                $historyFile = $usersDir . '/' . $u . '/recently_played.json';
                $history = self::readJson($historyFile);
                if (is_array($history)) {
                    foreach ($history as $track) {
                        $vid = $track['videoId'] ?? $track['video_id'] ?? $track['id'] ?? null;
                        if (!$vid) continue;

                        $realArt = '';
                        foreach (['image', 'thumbnail', 'artwork_url'] as $k) {
                            if (!empty($track[$k]) && is_string($track[$k]) && strpos($track[$k], 'unsplash.com') === false) {
                                $realArt = $track[$k];
                                break;
                            }
                        }
                        if (empty($realArt)) {
                            if (strlen($vid) === 11) {
                                $realArt = "https://i.ytimg.com/vi/{$vid}/hqdefault.jpg";
                            } else {
                                require_once __DIR__ . '/../services/jiosaavn.php';
                                $sDetails = JioSaavnService::getSongDetails($vid);
                                if (!empty($sDetails['image'])) {
                                    $realArt = $sDetails['image'];
                                }
                            }
                        }
                        if (!empty($realArt)) {
                            $track['image'] = $realArt;
                            $track['thumbnail'] = $realArt;
                            $track['artwork_url'] = $realArt;
                        }

                        if (!isset($historyTracksMap[$vid])) {
                            $historyTracksMap[$vid] = [
                                'track' => $track,
                                'playCount' => 0,
                                'lastPlayed' => $track['playedAt'] ?? $track['played_at'] ?? 0,
                            ];
                        }
                        $historyTracksMap[$vid]['playCount']++;
                    }
                }
            }
        }

        // Sort aggregated history tracks by play count
        $historyBasedPlaylists = [];
        if (!empty($historyTracksMap)) {
            usort($historyTracksMap, function($a, $b) {
                return $b['playCount'] - $a['playCount'];
            });
            $topTracks = array_map(function($item) {
                return $item['track'];
            }, array_slice($historyTracksMap, 0, 30));

            $firstCover = '';
            foreach (['image', 'thumbnail', 'artwork_url'] as $k) {
                if (!empty($topTracks[0][$k]) && is_string($topTracks[0][$k]) && strpos($topTracks[0][$k], 'unsplash.com') === false) {
                    $firstCover = $topTracks[0][$k];
                    break;
                }
            }
            if (empty($firstCover)) {
                $fVid = $topTracks[0]['videoId'] ?? $topTracks[0]['video_id'] ?? $topTracks[0]['id'] ?? '';
                if (strlen($fVid) === 11) {
                    $firstCover = "https://i.ytimg.com/vi/{$fVid}/hqdefault.jpg";
                }
            }

            $historyBasedPlaylists[] = [
                'id' => 'public_pl_community_top',
                'name' => 'Staytup Community Top Tracks',
                'description' => 'Real-time trending hits based on all Staytup user listening histories.',
                'cover_url' => $firstCover,
                'is_public' => true,
                'isPublic' => true,
                'type' => 'public',
                'creator_name' => 'Staytup Community',
                'track_count' => count($topTracks),
                'tracks' => $topTracks
            ];
        }

        // 3. High quality curated public playlists
        $curatedPublic = [];

        // Combine: community top history + user public playlists + curated playlists
        $allPublic = array_merge($historyBasedPlaylists, $userPublicPlaylists, $curatedPublic);

        // Deduplicate by ID and ensure first track artwork is used as playlist cover
        $seen = [];
        $result = [];
        $blockedIds = ['public_pl_top_hits', 'public_pl_viral_vibes', 'public_pl_chill_vibes'];
        $blockedNames = ['staytup global top hits', 'viral hits 2026', 'midnight chill & lo-fi', 'midnight chill and lo-fi'];
        foreach ($allPublic as $p) {
            $pid = strtolower(trim($p['id'] ?? ''));
            $pname = strtolower(trim($p['name'] ?? ''));
            if (in_array($pid, $blockedIds) || in_array($pname, $blockedNames) || strpos($pid, 'top_hits') !== false || strpos($pid, 'viral_vibes') !== false || strpos($pname, 'global top hits') !== false || strpos($pname, 'viral hits') !== false || strpos($pname, 'midnight chill') !== false) {
                continue;
            }
            if ($pid && !isset($seen[$pid])) {
                $seen[$pid] = true;

                // Ensure all tracks have real music thumbnails and playlist cover is first track's image
                $plTracks = $p['tracks'] ?? [];
                if (!empty($plTracks) && is_array($plTracks)) {
                    foreach ($plTracks as &$t) {
                        $tVid = $t['videoId'] ?? $t['video_id'] ?? $t['id'] ?? null;
                        $tArt = '';
                        foreach (['image', 'thumbnail', 'artwork_url'] as $k) {
                            if (!empty($t[$k]) && is_string($t[$k]) && strpos($t[$k], 'unsplash.com') === false) {
                                $tArt = $t[$k];
                                break;
                            }
                        }
                        if (empty($tArt) && !empty($tVid)) {
                            if (strlen($tVid) === 11) {
                                $tArt = "https://i.ytimg.com/vi/{$tVid}/hqdefault.jpg";
                            } else {
                                require_once __DIR__ . '/../services/jiosaavn.php';
                                $sDetails = JioSaavnService::getSongDetails($tVid);
                                if (!empty($sDetails['image'])) {
                                    $tArt = $sDetails['image'];
                                }
                            }
                        }
                        if (!empty($tArt)) {
                            $t['artwork_url'] = $tArt;
                            $t['thumbnail'] = $tArt;
                            $t['image'] = $tArt;
                        }
                    }
                    unset($t);
                    $p['tracks'] = $plTracks;

                    $firstCover = '';
                    foreach (['image', 'thumbnail', 'artwork_url'] as $k) {
                        if (!empty($plTracks[0][$k]) && is_string($plTracks[0][$k]) && strpos($plTracks[0][$k], 'unsplash.com') === false) {
                            $firstCover = $plTracks[0][$k];
                            break;
                        }
                    }
                    if (empty($firstCover)) {
                        $firstVid = $plTracks[0]['videoId'] ?? $plTracks[0]['video_id'] ?? $plTracks[0]['id'] ?? null;
                        if ($firstVid && strlen($firstVid) === 11) {
                            $firstCover = "https://i.ytimg.com/vi/{$firstVid}/hqdefault.jpg";
                        }
                    }
                    if (!empty($firstCover)) {
                        $p['cover_url'] = $firstCover;
                        $p['preview_artwork'] = $firstCover;
                        $p['image'] = $firstCover;
                        $p['artwork_url'] = $firstCover;
                        $p['thumbnail'] = $firstCover;
                    }
                }

                $result[] = $p;
            }
        }

        self::writeJson($publicPath, $result);
        return $result;
    }

    // ==================== FRIENDS ====================
    
    public static function getFriends($userId) {
        $dir = self::getUserDir($userId);
        return self::readJson($dir . '/friends.json') ?? [];
    }
    
    public static function addFriend($userId, $friendId, $friendData) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/friends.json';
        $friends = self::readJson($path) ?? [];
        
        if (!isset($friends[$friendId])) {
            $friends[$friendId] = $friendData;
            self::writeJson($path, $friends);
            return true;
        }
        return false;
    }
    
    public static function removeFriend($userId, $friendId) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/friends.json';
        $friends = self::readJson($path) ?? [];
        
        if (isset($friends[$friendId])) {
            unset($friends[$friendId]);
            self::writeJson($path, $friends);
            return true;
        }
        return false;
    }
    
    public static function isFriend($userId, $friendId) {
        $friends = self::getFriends($userId);
        return isset($friends[$friendId]);
    }
    
    public static function getFriendRequests($userId) {
        $dir = self::getUserDir($userId);
        return self::readJson($dir . '/friend_requests.json') ?? [];
    }
    
    public static function sendFriendRequest($fromUserId, $toUserId, $fromUserData) {
        $dir = self::getUserDir($toUserId);
        $path = $dir . '/friend_requests.json';
        $requests = self::readJson($path) ?? [];
        
        foreach ($requests as $req) {
            if ($req['from_user_id'] === $fromUserId) {
                return false;
            }
        }
        
        $requests[] = [
            'id' => uniqid('fr_', true),
            'from_user_id' => $fromUserId,
            'name' => $fromUserData['username'] ?? $fromUserData['displayName'] ?? 'Unknown',
            'avatar' => $fromUserData['avatar'] ?? '',
            'created_at' => time(),
        ];
        
        self::writeJson($path, $requests);
        return true;
    }
    
    public static function acceptFriendRequest($userId, $requestId) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/friend_requests.json';
        $requests = self::readJson($path) ?? [];
        
        $found = null;
        foreach ($requests as $i => $req) {
            if ($req['id'] === $requestId) {
                $found = $req;
                unset($requests[$i]);
                break;
            }
        }
        
        if ($found) {
            self::writeJson($path, array_values($requests));
            return $found;
        }
        return null;
    }
    
    public static function declineFriendRequest($userId, $requestId) {
        $dir = self::getUserDir($userId);
        $path = $dir . '/friend_requests.json';
        $requests = self::readJson($path) ?? [];
        
        $found = false;
        foreach ($requests as $i => $req) {
            if ($req['id'] === $requestId) {
                unset($requests[$i]);
                $found = true;
                break;
            }
        }
        
        if ($found) {
            self::writeJson($path, array_values($requests));
        }
        return $found;
    }
    
    public static function searchUsers($query, $limit = 20) {
        $usersDir = self::getDataDir() . '/users';
        if (!is_dir($usersDir)) return [];
        
        $results = [];
        $query = strtolower(trim($query));
        
        $userFolders = scandir($usersDir);
        foreach ($userFolders as $u) {
            if ($u === '.' || $u === '..' || $u === 'guest_user') continue;
            
            $profileFile = $usersDir . '/' . $u . '/profile.json';
            $profile = self::readJson($profileFile);
            
            if (!$profile) continue;
            
            $username = strtolower($profile['username'] ?? '');
            $displayName = strtolower($profile['displayName'] ?? '');
            
            if (strpos($username, $query) !== false || strpos($displayName, $query) !== false) {
                $results[] = [
                    'id' => $u,
                    'username' => $profile['username'] ?? 'Unknown',
                    'displayName' => $profile['displayName'] ?? $profile['username'] ?? 'Unknown',
                    'avatar' => $profile['avatar'] ?? './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg',
                ];
                
                if (count($results) >= $limit) break;
            }
        }
        
        return $results;
    }

    // ==================== ARTIST IMAGE CACHE (DATABASE) ====================

    public static function getCachedArtistImage($artistKey) {
        $cleanKey = strtolower(trim(preg_replace('/[^a-zA-Z0-9_-]/', '_', $artistKey)));
        $cachePath = self::getDataDir() . '/artists_cache.json';
        $cache = self::readJson($cachePath) ?? [];
        return $cache[$cleanKey] ?? null;
    }

    public static function setCachedArtistImage($artistKey, $imageData) {
        $cleanKey = strtolower(trim(preg_replace('/[^a-zA-Z0-9_-]/', '_', $artistKey)));
        $cachePath = self::getDataDir() . '/artists_cache.json';
        $cache = self::readJson($cachePath) ?? [];
        $cache[$cleanKey] = $imageData;
        self::writeJson($cachePath, $cache);
    }
}
