<?php
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/storage.php';

class BlendRoutes {
    public static function handle($action, $method, $params = []) {
        switch ($action) {
            case 'list_user_blends':
                self::listUserBlends($method);
                break;
            case 'get':
                self::getBlend($method, $params['id'] ?? null);
                break;
            case 'save':
            case 'create':
                self::createOrSaveBlend($method);
                break;
            case 'generate_invite':
                self::generateInvite($method);
                break;
            case 'get_invite':
                self::getInvite($method, $params['token'] ?? null);
                break;
            case 'join_invite':
                self::joinInvite($method, $params['token'] ?? null);
                break;
            default:
                sendError('Unknown blend endpoint', 404);
        }
    }

    private static function listUserBlends($method) {
        if ($method !== 'GET') sendError('Method not allowed', 405);
        $userId = $_SERVER['HTTP_X_USER_ID'] ?? getQueryParam('user_id');
        if (!$userId) sendError('User ID is required', 400);

        $blends = Storage::getUserBlends($userId);
        sendJson(['blends' => $blends]);
    }

    private static function getBlend($method, $blendId) {
        if ($method !== 'GET') sendError('Method not allowed', 405);
        if (!$blendId) sendError('Blend ID is required', 400);

        $blend = Storage::getBlendData($blendId);
        if (!$blend) {
            sendError('Blend not found', 404);
        }

        sendJson(['blend' => $blend]);
    }

    private static function createOrSaveBlend($method) {
        if ($method !== 'POST') sendError('Method not allowed', 405);
        $body = getRequestBody();
        $blendId = $body['id'] ?? null;
        if (!$blendId) {
            sendError('Blend id is required', 400);
        }

        $userId = $_SERVER['HTTP_X_USER_ID'] ?? $body['userId'] ?? $body['user_id'] ?? null;
        Storage::saveBlendData($blendId, $body, $userId);

        sendJson([
            'success' => true,
            'blend'   => $body,
        ]);
    }

    private static function generateInvite($method) {
        if ($method !== 'POST') sendError('Method not allowed', 405);
        $body = getRequestBody();
        $blendId = $body['blendId'] ?? $body['id'] ?? null;
        $inviter = $body['inviter'] ?? null;

        if (!$blendId) {
            sendError('blendId is required', 400);
        }

        $token = bin2hex(random_bytes(16));
        $inviteData = [
            'token'     => $token,
            'blendId'   => $blendId,
            'inviter'   => $inviter,
            'createdAt' => time(),
        ];

        Storage::saveInviteToken($token, $inviteData);

        sendJson([
            'success' => true,
            'token'   => $token,
            'url'     => '/blend/invite/' . $token,
        ]);
    }

    private static function getInvite($method, $token) {
        if ($method !== 'GET') sendError('Method not allowed', 405);
        if (!$token) sendError('Token is required', 400);

        $invite = Storage::getInviteToken($token);
        if (!$invite) {
            sendError('Invite link is invalid or expired', 404);
        }

        $blend = Storage::getBlendData($invite['blendId']);
        sendJson([
            'valid'   => true,
            'invite'  => $invite,
            'blend'   => $blend,
        ]);
    }

    private static function joinInvite($method, $token) {
        if ($method !== 'POST') sendError('Method not allowed', 405);
        if (!$token) sendError('Token is required', 400);

        $invite = Storage::getInviteToken($token);
        if (!$invite) {
            sendError('Invite link is invalid or expired', 404);
        }

        $body = getRequestBody();
        $newUser = $body['user'] ?? null;
        if (!$newUser || empty($newUser['id'])) {
            sendError('User data is required to join blend', 400);
        }

        $blend = Storage::getBlendData($invite['blendId']);
        if (!$blend) {
            sendError('Associated blend not found', 404);
        }

        // Add user to members if not already joined
        $members = $blend['members'] ?? [];
        $exists = false;
        foreach ($members as $m) {
            if ((string)($m['id'] ?? '') === (string)$newUser['id']) {
                $exists = true;
                break;
            }
        }

        if (!$exists) {
            $members[] = [
                'id'          => $newUser['id'],
                'name'        => $newUser['name'] ?? $newUser['displayName'] ?? $newUser['username'] ?? 'Listener',
                'username'    => $newUser['username'] ?? '',
                'avatar'      => $newUser['avatar'] ?? '',
                'joinedAt'    => time(),
            ];
            $blend['members'] = $members;
            $blend['updatedAt'] = time();

            // Link blend to user's blends list
            Storage::saveBlendData($blend['id'], $blend, $newUser['id']);
        }

        sendJson([
            'success' => true,
            'blend'   => $blend,
        ]);
    }
}
