<?php
/**
 * Authentication Routes
 */

require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/storage.php';

class AuthRoutes {
    
    public static function handle($action, $method) {
        switch ($action) {
            case 'pin':
                return self::pinLogin($method);
            case 'phone':
                return self::phoneLogin($method);
            default:
                sendError('Unknown auth action', 404);
        }
    }
    
    private static function pinLogin($method) {
        if ($method !== 'POST') sendError('Method not allowed', 405);
        
        $body = getRequestBody();
        $username = $body['username'] ?? '';
        $pin = $body['pin'] ?? '';
        
        if (empty($username) || empty($pin)) {
            sendError('Username and PIN are required');
        }
        
        if (strlen($pin) !== 4 || !ctype_digit($pin)) {
            sendError('PIN must be 4 digits');
        }
        
        $cleanUsername = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $username));
        $dataDir = Storage::getDataDir();
        $pinUsersDir = $dataDir . '/pin_users';
        
        if (!is_dir($pinUsersDir)) mkdir($pinUsersDir, 0755, true);
        
        $userFile = $pinUsersDir . "/{$cleanUsername}.json";
        
        if (file_exists($userFile)) {
            // Existing user - verify PIN
            $user = json_decode(file_get_contents($userFile), true);
            if ($user['pin'] !== $pin) {
                sendError('Invalid PIN');
            }
            sendJson([
                'success'   => true,
                'user'      => ['uid' => $user['uid'], 'displayName' => $user['displayName']],
                'isNewUser' => false,
            ]);
        } else {
            // New user - create
            $uid = 'pin_' . $cleanUsername . '_' . base_convert(time(), 10, 36);
            $user = [
                'uid'         => $uid,
                'displayName' => ucwords($username),
                'username'    => $username,
                'cleanUser'   => $cleanUsername,
                'pin'         => $pin,
                'createdAt'   => time(),
            ];
            file_put_contents($userFile, json_encode($user, JSON_PRETTY_PRINT));
            
            sendJson([
                'success'   => true,
                'user'      => ['uid' => $uid, 'displayName' => $user['displayName']],
                'isNewUser' => true,
            ]);
        }
    }
    
    private static function phoneLogin($method) {
        // Phone auth requires SMS provider integration
        sendError('Phone authentication requires SMS provider setup', 501);
    }
}
