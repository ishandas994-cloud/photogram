const db = require('../config/db');
const { processImage } = require('../middleware/upload');

// ─── GET /api/users/:username ───────────────────────────────
exports.getProfile = async (req, res) => {
  const { username } = req.params;
  const viewerId = req.user?.id;

  try {
    const { rows } = await db.query(
      `SELECT
         u.id, u.username, u.full_name, u.bio, u.avatar_url,
         u.website, u.is_private, u.is_verified, u.created_at,
         (SELECT COUNT(*) FROM posts
          WHERE user_id=u.id AND is_archived=FALSE)        AS post_count,
         (SELECT COUNT(*) FROM follows
          WHERE following_id=u.id AND status='accepted')   AS follower_count,
         (SELECT COUNT(*) FROM follows
          WHERE follower_id=u.id AND status='accepted')    AS following_count,
         CASE WHEN $2::uuid IS NOT NULL THEN
           (SELECT status FROM follows
            WHERE follower_id=$2 AND following_id=u.id)
         END AS follow_status,
         CASE WHEN $2::uuid IS NOT NULL THEN
           EXISTS(SELECT 1 FROM user_blocks
                  WHERE blocker_id=$2 AND blocked_id=u.id)
         END AS is_blocked
       FROM users u
       WHERE u.username=$1 AND u.is_active=TRUE`,
      [username, viewerId || null]
    );

    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    const user = rows[0];

    // Private account gate
    if (user.is_private && user.follow_status !== 'accepted'
        && user.id !== viewerId) {
      return res.json({ ...user, posts: [], private: true });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
};

// ─── PUT /api/users/me ──────────────────────────────────────
exports.updateProfile = async (req, res) => {
  const { full_name, bio, website, is_private } = req.body;
  const userId = req.user.id;

  try {
    let avatarUrl;
    if (req.file) {
      const result = await processImage(req.file.buffer, 'avatars',
        { maxWidth: 400, maxHeight: 400 });
      avatarUrl = result.url;
    }

    const { rows } = await db.query(
      `UPDATE users SET
         full_name  = COALESCE($1, full_name),
         bio        = COALESCE($2, bio),
         website    = COALESCE($3, website),
         is_private = COALESCE($4, is_private),
         avatar_url = COALESCE($5, avatar_url)
       WHERE id=$6
       RETURNING id, username, email, full_name, bio,
                 avatar_url, website, is_private, is_verified`,
      [full_name, bio, website, is_private, avatarUrl, userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed.' });
  }
};

// ─── GET /api/users/search?q= ───────────────────────────────
exports.searchUsers = async (req, res) => {
  const q      = (req.query.q || '').trim();
  const limit  = Math.min(parseInt(req.query.limit  || '20'), 50);
  const offset = parseInt(req.query.offset || '0');

  if (q.length < 1) return res.json([]);

  try {
    const { rows } = await db.query(
      `SELECT id, username, full_name, avatar_url, is_verified,
              (SELECT COUNT(*) FROM follows
               WHERE following_id=users.id AND status='accepted') AS follower_count
       FROM users
       WHERE (username ILIKE $1 OR full_name ILIKE $1)
         AND is_active=TRUE
       ORDER BY follower_count DESC
       LIMIT $2 OFFSET $3`,
      [`%${q}%`, limit, offset]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed.' });
  }
};

// ─── POST /api/users/:username/follow ───────────────────────
exports.follow = async (req, res) => {
  const followerId = req.user.id;
  const { rows: target } = await db.query(
    'SELECT id, is_private FROM users WHERE username=$1 AND is_active=TRUE',
    [req.params.username]
  );

  if (!target[0]) return res.status(404).json({ error: 'User not found.' });
  const followingId = target[0].id;
  if (followerId === followingId)
    return res.status(400).json({ error: 'Cannot follow yourself.' });

  const status = target[0].is_private ? 'pending' : 'accepted';

  try {
    await db.query(
      `INSERT INTO follows (follower_id, following_id, status)
       VALUES ($1,$2,$3)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [followerId, followingId, status]
    );
    await db.query(
      `INSERT INTO notifications (recipient_id, actor_id, type)
       VALUES ($1,$2,$3)`,
      [followingId, followerId,
       status === 'pending' ? 'follow_request' : 'follow']
    );
    res.json({ status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Follow failed.' });
  }
};

// ─── DELETE /api/users/:username/follow ─────────────────────
exports.unfollow = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username=$1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });

  await db.query(
    'DELETE FROM follows WHERE follower_id=$1 AND following_id=$2',
    [req.user.id, target[0].id]
  );
  res.json({ message: 'Unfollowed.' });
};

// ─── GET /api/users/:username/followers ─────────────────────
exports.getFollowers = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username=$1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });

  const { rows } = await db.query(
    `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified
     FROM follows f JOIN users u ON u.id=f.follower_id
     WHERE f.following_id=$1 AND f.status='accepted' AND u.is_active=TRUE
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [target[0].id,
     parseInt(req.query.limit || '30'),
     parseInt(req.query.offset || '0')]
  );
  res.json(rows);
};

// ─── GET /api/users/:username/following ─────────────────────
exports.getFollowing = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username=$1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });

  const { rows } = await db.query(
    `SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified
     FROM follows f JOIN users u ON u.id=f.following_id
     WHERE f.follower_id=$1 AND f.status='accepted' AND u.is_active=TRUE
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [target[0].id,
     parseInt(req.query.limit || '30'),
     parseInt(req.query.offset || '0')]
  );
  res.json(rows);
};

// ─── POST /api/users/:username/block ────────────────────────
exports.blockUser = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username=$1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });

  const blockerId = req.user.id;
  const blockedId = target[0].id;
  if (blockerId === blockedId)
    return res.status(400).json({ error: 'Cannot block yourself.' });

  // Remove follows both ways first
  await db.query(
    `DELETE FROM follows
     WHERE (follower_id=$1 AND following_id=$2)
        OR (follower_id=$2 AND following_id=$1)`,
    [blockerId, blockedId]
  );
  await db.query(
    'INSERT INTO user_blocks (blocker_id,blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [blockerId, blockedId]
  );
  res.json({ message: 'User blocked.' });
};
// ── POST /users/:username/follow/accept ─────────────────────
exports.acceptFollow = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username = $1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });

  await db.query(
    `UPDATE follows SET status = 'accepted'
     WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'`,
    [target[0].id, req.user.id]
  );

  await db.query(
    `INSERT INTO notifications (recipient_id, actor_id, type)
     VALUES ($1, $2, 'follow_accept')`,
    [target[0].id, req.user.id]
  );

  res.json({ message: 'Follow request accepted.' });
};

// ── POST /users/:username/follow/accept ─────────────────────
exports.acceptFollow = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username = $1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });

  await db.query(
    `UPDATE follows SET status = 'accepted'
     WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'`,
    [target[0].id, req.user.id]
  );

  await db.query(
    `INSERT INTO notifications (recipient_id, actor_id, type)
     VALUES ($1, $2, 'follow_accept')`,
    [target[0].id, req.user.id]
  );

  res.json({ message: 'Accepted.' });
};

// ── DELETE /users/:username/follow/decline ──────────────────
exports.declineFollow = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username = $1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });

  await db.query(
    `DELETE FROM follows
     WHERE follower_id = $1 AND following_id = $2 AND status = 'pending'`,
    [target[0].id, req.user.id]
  );

  res.json({ message: 'Declined.' });
};
exports.acceptFollow = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username = $1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });
  await db.query(
    `UPDATE follows SET status='accepted' WHERE follower_id=$1 AND following_id=$2 AND status='pending'`,
    [target[0].id, req.user.id]
  );
  await db.query(
    `INSERT INTO notifications (recipient_id, actor_id, type) VALUES ($1,$2,'follow_accept')`,
    [target[0].id, req.user.id]
  );
  res.json({ message: 'Accepted.' });
};

exports.declineFollow = async (req, res) => {
  const { rows: target } = await db.query(
    'SELECT id FROM users WHERE username = $1', [req.params.username]
  );
  if (!target[0]) return res.status(404).json({ error: 'User not found.' });
  await db.query(
    `DELETE FROM follows WHERE follower_id=$1 AND following_id=$2 AND status='pending'`,
    [target[0].id, req.user.id]
  );
  res.json({ message: 'Declined.' });
};