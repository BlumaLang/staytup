<?php
require_once __DIR__ . '/../utils/storage.php';

class FriendRoutes {
    public static function handle($action, $method, $params = []) {
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? getQueryParam('user_id');
        
        if (!$userId) {
            sendError('User ID is required', 401);
        }
        
        switch ($action) {
            case 'search':
                self::searchUsers($method);
                break;
            case 'list':
                self::listFriends($method, $userId);
                break;
            case 'requests':
                self::listRequests($method, $userId);
                break;
            case 'send':
                self::sendRequest($method, $userId);
                break;
            case 'accept':
                self::acceptRequest($method, $userId, $params['id'] ?? null);
                break;
            case 'decline':
                self::declineRequest($method, $userId, $params['id'] ?? null);
                break;
            case 'remove':
                self::removeFriend($method, $userId, $params['id'] ?? null);
                break;
            default:
                sendError('Unknown friends endpoint', 404);
        }
    }
    
    private static function searchUsers($method) {
        if ($method !== 'GET') {
            sendError('Method not allowed', 405);
        }
        
        $query = getQueryParam('q', '');
        $limit = (int) getQueryParam('limit', 20);
        
        if (strlen($query) < 2) {
            sendJson(['users' => []]);
            return;
        }
        
        $users = Storage::searchUsers($query, $limit);
        sendJson(['users' => $users]);
    }
    
    private static function listFriends($method, $userId) {
        if ($method !== 'GET') {
            sendError('Method not allowed', 405);
        }
        
        $friends = Storage::getFriends($userId);
        $result = [];
        
        foreach ($friends as $friendId => $friendData) {
            $result[] = array_merge(['id' => $friendId], $friendData);
        }
        
        sendJson(['friends' => $result]);
    }
    
    private static function listRequests($method, $userId) {
        if ($method !== 'GET') {
            sendError('Method not allowed', 405);
        }
        
        $requests = Storage::getFriendRequests($userId);
        sendJson(['requests' => $requests]);
    }
    
    private static function sendRequest($method, $userId) {
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        
        $body = getRequestBody();
        $toUserId = $body['to_user_id'] ?? null;
        
        if (!$toUserId) {
            sendError('to_user_id is required');
        }
        
        if ($toUserId === $userId) {
            sendError('Cannot send friend request to yourself');
        }
        
        if (Storage::isFriend($userId, $toUserId)) {
            sendError('Already friends');
        }
        
        $userProfile = Storage::getUserProfile($userId);
        if (!$userProfile) {
            sendError('User profile not found');
        }
        
        $sent = Storage::sendFriendRequest($userId, $toUserId, $userProfile);
        
        if ($sent) {
            sendSuccess(['message' => 'Friend request sent']);
        } else {
            sendError('Friend request already sent');
        }
    }
    
    private static function acceptRequest($method, $userId, $requestId) {
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        
        if (!$requestId) {
            sendError('Request ID is required');
        }
        
        $request = Storage::acceptFriendRequest($userId, $requestId);
        
        if ($request) {
            $fromUserId = $request['from_user_id'];
            $fromProfile = Storage::getUserProfile($fromUserId);
            
            Storage::addFriend($userId, $fromUserId, [
                'name' => $request['name'],
                'avatar' => $request['avatar'],
                'status' => 'Online',
                'song' => 'Listening to Staytup',
                'time' => 'Just now',
                'isOnline' => true,
            ]);
            
            $toProfile = Storage::getUserProfile($userId);
            Storage::addFriend($fromUserId, $userId, [
                'name' => $toProfile['username'] ?? 'Unknown',
                'avatar' => $toProfile['avatar'] ?? '',
                'status' => 'Online',
                'song' => 'Listening to Staytup',
                'time' => 'Just now',
                'isOnline' => true,
            ]);
            
            sendSuccess(['message' => 'Friend request accepted']);
        } else {
            sendError('Friend request not found');
        }
    }
    
    private static function declineRequest($method, $userId, $requestId) {
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        
        if (!$requestId) {
            sendError('Request ID is required');
        }
        
        $declined = Storage::declineFriendRequest($userId, $requestId);
        
        if ($declined) {
            sendSuccess(['message' => 'Friend request declined']);
        } else {
            sendError('Friend request not found');
        }
    }
    
    private static function removeFriend($method, $userId, $friendId) {
        if ($method !== 'DELETE') {
            sendError('Method not allowed', 405);
        }
        
        if (!$friendId) {
            sendError('Friend ID is required');
        }
        
        Storage::removeFriend($userId, $friendId);
        Storage::removeFriend($friendId, $userId);
        
        sendSuccess(['message' => 'Friend removed']);
    }
}
