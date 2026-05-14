
const db = require('../config/db');
const { processImage, saveVideo } = require('../middleware/upload');

// ─── POST /api/stories ──────────────────────────────────────
exports.createStory = async (req, res) => {
  const { caption, link } = req.body;
  const userId = req.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      error: 'Media file required.',
    });
  }

  console.log('Uploaded file:', file);

  try {
    const isVideo =
      file.mimetype?.startsWith('video') ||
      file.resource_type === 'video';

    const url = file.path || file.secure_url;

    const thumb = isVideo
      ? url
          .replace(
            '/upload/',
            '/upload/so_0,w_400,h_400,c_fill,q_auto,f_jpg/'
          )
          .replace(/\.(mp4|webm|mov)$/i, '.jpg')
      : url.replace(
          '/upload/',
          '/upload/w_300,h_300,c_fill,q_auto/'
        );

    const { rows: [story] } = await db.query(
      `INSERT INTO stories
      (
        user_id,
        media_url,
        thumbnail_url,
        media_type,
        caption,
        link
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        userId,
        url,
        thumb,
        isVideo ? 'video' : 'image',
        caption || null,
        link || null,
      ]
    );

    res.status(201).json(story);

  } catch (err) {
    console.error('Story upload error:', err);

    res.status(500).json({
      error: 'Story upload failed.',
    });
  }
};

// ─── GET /api/stories/feed ──────────────────────────────────
// Returns stories grouped by user (Instagram tray style)
exports.getStoryFeed = async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT
         u.id AS user_id, u.username, u.avatar_url, u.is_verified,
         json_agg(
           json_build_object(
             'id',            s.id,
             'media_url',     s.media_url,
             'thumbnail_url', s.thumbnail_url,
             'media_type',    s.media_type,
             'duration_sec',  s.duration_sec,
             'caption',       s.caption,
             'link',          s.link,
             'created_at',    s.created_at,
             'viewed', EXISTS(
               SELECT 1 FROM story_views sv
               WHERE sv.story_id = s.id AND sv.viewer_id = $1)
           ) ORDER BY s.created_at ASC
         ) AS stories,
         BOOL_AND(EXISTS(
           SELECT 1 FROM story_views sv
           WHERE sv.story_id = s.id AND sv.viewer_id = $1
         )) AS all_viewed,
         -- put own stories first (order_priority = 0), others after
         CASE WHEN u.id = $1 THEN 0 ELSE 1 END AS order_priority
       FROM stories s
       JOIN users u ON u.id = s.user_id
       WHERE (
         -- own stories
         s.user_id = $1
         OR
         -- followed users stories
         s.user_id IN (
           SELECT following_id FROM follows
           WHERE follower_id = $1 AND status = 'accepted'
         )
       )
         AND s.expires_at > NOW()
         AND s.is_highlight = FALSE
         AND u.is_active = TRUE
       GROUP BY u.id, u.username, u.avatar_url, u.is_verified
       ORDER BY order_priority ASC, all_viewed ASC, MAX(s.created_at) DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stories feed failed.' });
  }
};
// ─── GET /api/stories/:id ───────────────────────────────────
exports.getStory = async (req, res) => {
  const { rows:[story] } = await db.query(
    `SELECT s.*, u.username, u.avatar_url, u.is_verified
     FROM stories s JOIN users u ON u.id=s.user_id
     WHERE s.id=$1`,
    [req.params.id]
  );
  if (!story) return res.status(404).json({ error: 'Story not found.' });
  res.json(story);
};

// ─── POST /api/stories/:id/view ─────────────────────────────
exports.viewStory = async (req, res) => {
  await db.query(
    'INSERT INTO story_views (story_id,viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.params.id, req.user.id]
  );
  res.json({ viewed: true });
};

// ─── GET /api/stories/:id/viewers ───────────────────────────
exports.getViewers = async (req, res) => {
  const { id } = req.params;
  const { rows:[story] } = await db.query(
    'SELECT user_id FROM stories WHERE id=$1', [id]
  );
  if (!story) return res.status(404).json({ error: 'Story not found.' });
  if (story.user_id !== req.user.id)
    return res.status(403).json({ error: 'Not your story.' });

  const { rows } = await db.query(
    `SELECT u.id, u.username, u.avatar_url, sv.viewed_at
     FROM story_views sv JOIN users u ON u.id=sv.viewer_id
     WHERE sv.story_id=$1
     ORDER BY sv.viewed_at DESC`,
    [id]
  );
  res.json(rows);
};

// ─── POST /api/stories/:id/react ────────────────────────────
exports.reactToStory = async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji required.' });
  await db.query(
    `INSERT INTO story_reactions (story_id,user_id,emoji)
     VALUES ($1,$2,$3)
     ON CONFLICT (story_id,user_id) DO UPDATE SET emoji=$3`,
    [req.params.id, req.user.id, emoji]
  );
  res.json({ reacted: true, emoji });
};

// ─── DELETE /api/stories/:id ────────────────────────────────
exports.deleteStory = async (req, res) => {
  const { rows:[s] } = await db.query(
    'SELECT user_id FROM stories WHERE id=$1', [req.params.id]
  );
  if (!s) return res.status(404).json({ error: 'Story not found.' });
  if (s.user_id !== req.user.id)
    return res.status(403).json({ error: 'Not your story.' });
  await db.query('DELETE FROM stories WHERE id=$1', [req.params.id]);
  res.json({ message: 'Story deleted.' });
};

// ─── POST /api/stories/highlights ───────────────────────────
exports.createHighlight = async (req, res) => {
  const { title, cover_url, story_ids } = req.body;
  if (!title || !story_ids?.length)
    return res.status(400).json({ error: 'Title and stories required.' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows:[h] } = await client.query(
      `INSERT INTO story_highlights (user_id,title,cover_url)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.user.id, title, cover_url||null]
    );
    for (const sid of story_ids) {
      await client.query(
        'INSERT INTO highlight_stories VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [h.id, sid]
      );
      await client.query(
        'UPDATE stories SET is_highlight=TRUE WHERE id=$1 AND user_id=$2',
        [sid, req.user.id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(h);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Highlight creation failed.' });
  } finally {
    client.release();
  }
};

// ─── GET /api/users/:username/highlights ────────────────────
exports.getUserHighlights = async (req, res) => {
  const { rows:[user] } = await db.query(
    'SELECT id FROM users WHERE username=$1', [req.params.username]
  );
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { rows } = await db.query(
    `SELECT h.*, COUNT(hs.story_id) AS story_count
     FROM story_highlights h
     LEFT JOIN highlight_stories hs ON hs.highlight_id=h.id
     WHERE h.user_id=$1
     GROUP BY h.id ORDER BY h.position, h.created_at`,
    [user.id]
  );
  res.json(rows);
};