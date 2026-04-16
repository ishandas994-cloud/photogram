const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

/**
 * GET /api/search?q=term&type=all|users|hashtags|posts
 * Returns a combined search result object.
 */
router.get('/', optionalAuth, async (req, res) => {
  const q      = (req.query.q || '').trim();
  const type   = req.query.type || 'all';
  const limit  = Math.min(parseInt(req.query.limit || '10'), 30);

  if (q.length < 1) return res.json({ users: [], hashtags: [], posts: [] });

  try {
    const results = {};

    // ── Users ────────────────────────────────────────────────
    if (type === 'all' || type === 'users') {
      const { rows } = await db.query(
        `SELECT id, username, full_name, avatar_url, is_verified,
                (SELECT COUNT(*) FROM follows WHERE following_id = users.id AND status = 'accepted') AS follower_count
         FROM users
         WHERE (username ILIKE $1 OR full_name ILIKE $1) AND is_active = TRUE
         ORDER BY follower_count DESC, username
         LIMIT $2`,
        [`%${q}%`, limit]
      );
      results.users = rows;
    }

    // ── Hashtags ─────────────────────────────────────────────
    if (type === 'all' || type === 'hashtags') {
      const { rows } = await db.query(
        `SELECT id, name, post_count
         FROM hashtags
         WHERE name ILIKE $1
         ORDER BY post_count DESC
         LIMIT $2`,
        [`%${q.replace(/^#/, '')}%`, limit]
      );
      results.hashtags = rows;
    }

    // ── Posts (by caption) ───────────────────────────────────
    if (type === 'posts') {
      const { rows } = await db.query(
        `SELECT p.id, p.type, p.caption, p.created_at,
                u.username, u.avatar_url,
                (SELECT pm.thumbnail_url FROM post_media pm WHERE pm.post_id = p.id ORDER BY position LIMIT 1) AS thumbnail
         FROM posts p
         JOIN users u ON u.id = p.user_id
         WHERE p.caption ILIKE $1
           AND p.is_archived = FALSE
           AND u.is_private  = FALSE
           AND u.is_active   = TRUE
         ORDER BY p.created_at DESC
         LIMIT $2`,
        [`%${q}%`, limit]
      );
      results.posts = rows;
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

module.exports = router;