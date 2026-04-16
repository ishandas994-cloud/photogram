const db = require('../config/db');

// ─── GET /api/notifications ─────────────────────────────────
exports.getNotifications = async (req, res) => {
  const userId = req.user.id;
  const limit  = Math.min(parseInt(req.query.limit || '30'), 50);
  const offset = parseInt(req.query.offset || '0');

  try {
    const { rows } = await db.query(
      `SELECT
         n.id, n.type, n.is_read, n.created_at,
         u.id          AS actor_id,
         u.username    AS actor_username,
         u.avatar_url  AS actor_avatar,
         u.is_verified AS actor_verified,
         n.post_id, n.comment_id, n.story_id,
         CASE WHEN n.post_id IS NOT NULL THEN
           (SELECT pm.thumbnail_url FROM post_media pm
            WHERE pm.post_id=n.post_id ORDER BY position LIMIT 1)
         END AS post_thumbnail
       FROM notifications n
       LEFT JOIN users u ON u.id=n.actor_id
       WHERE n.recipient_id=$1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const { rows:[{count}] } = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE recipient_id=$1 AND is_read=FALSE',
      [userId]
    );

    res.json({ notifications: rows, unreadCount: parseInt(count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
};

// ─── POST /api/notifications/read-all ──────────────────────
exports.markAllRead = async (req, res) => {
  await db.query(
    `UPDATE notifications SET is_read=TRUE
     WHERE recipient_id=$1 AND is_read=FALSE`,
    [req.user.id]
  );
  res.json({ message: 'All notifications marked as read.' });
};

// ─── POST /api/notifications/:id/read ──────────────────────
exports.markRead = async (req, res) => {
  await db.query(
    'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND recipient_id=$2',
    [req.params.id, req.user.id]
  );
  res.json({ read: true });
};