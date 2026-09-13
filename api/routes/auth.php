<?php
/**
 * Authentication Routes
 */

require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/storage.php';

class AuthRoutes {
    
    public static function handle($action, $method) {
        switch ($action) {
            case 'phone':
                return self::phoneLogin($method);
            default:
                sendError('Unknown auth action', 404);
        }
    }
    
    private static function phoneLogin($method) {
        // Phone auth requires SMS provider integration
        sendError('Phone authentication requires SMS provider setup', 501);
    }
}
