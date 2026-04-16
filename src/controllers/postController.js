
const db = require('../config/db');
const { processImage, saveVideo } = require('../middleware/upload');

const extractHashtags = (text='') =>
  [...new Set((text.match(/#[a-zA-Z0-9_]+/g)||[])
    .map(t => t.slice(1).toLowerCase()))];

// ─── POST /api/posts ────────────────────────────────────────
exports.createPost = async (req, res) => {
  const { caption, location, type='image',
          comments_off, likes_hidden } = req.body;
  const userId = req.user.id;
  const files  = req.files;

  if (!files?.length)
    return res.status(400).json({ error: 'At least one media file required.' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [post] } = await client.query(
      `INSERT INTO posts
         (user_id, caption, location, type, comments_off, likes_hidden)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [userId, caption||null, location||null, type,
       comments_off==='true', likes_hidden==='true']
    );

    const mediaRows = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVid = file.mimetype.startsWith('video/');
      const urls  = isVid
        ? await saveVideo(file.buffer, 'posts', file.originalname)
        : await processImage(file.buffer, 'posts');

      const { rows: [media] } = await client.query(
        `INSERT INTO post_media
           (post_id, media_url, thumbnail_url, media_type, position)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [post.id, urls.url, urls.thumbnailUrl,
         isVid ? 'video' : 'image', i]
      );
      mediaRows.push(media);
    }

    // Hashtags
    for (const name of extractHashtags(caption)) {
      const { rows: [tag] } = await client.query(
        `INSERT INTO hashtags (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE
           SET post_count = hashtags.post_count + 1
         RETURNING id`,
        [name]
      );
      await client.query(
        'INSERT INTO post_hashtags VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [post.id, tag.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...post, media: mediaRows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Post creation failed.' });
  } finally {
    client.release();
  }
};

// ─── GET /api/posts/feed ────────────────────────────────────
exports.getFeed = async (req, res) => {
  const userId = req.user.id;
  const limit  = Math.min(parseInt(req.query.limit || '20'), 50);
  const cursor = req.query.cursor;

  try {
    const { rows } = await db.query(
      `SELECT p.*,
              u.username, u.full_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM post_likes
               WHERE post_id=p.id)                            AS like_count,
              (SELECT COUNT(*) FROM comments
               WHERE post_id=p.id AND is_deleted=FALSE)       AS comment_count,
              EXISTS(SELECT 1 FROM post_likes
               WHERE post_id=p.id AND user_id=$1)             AS is_liked,
              EXISTS(SELECT 1 FROM saved_posts
               WHERE post_id=p.id AND user_id=$1)             AS is_saved,
              (SELECT json_agg(pm ORDER BY pm.position)
               FROM post_media pm WHERE pm.post_id=p.id)      AS media
       FROM posts p
       JOIN users u ON u.id=p.user_id
       WHERE p.user_id IN (
         SELECT following_id FROM follows
         WHERE follower_id=$1 AND status='accepted'
       )
         AND p.is_archived=FALSE
         AND u.is_active=TRUE
         AND NOT EXISTS(SELECT 1 FROM user_blocks
             WHERE blocker_id=$1 AND blocked_id=p.user_id)
         AND ($2::timestamptz IS NULL OR p.created_at < $2)
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [userId, cursor||null, limit]
    );
    const nextCursor = rows.length===limit
      ? rows[rows.length-1].created_at : null;
    res.json({ posts: rows, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Feed load failed.' });
  }
};

// ─── GET /api/posts/:id ─────────────────────────────────────
exports.getPost = async (req, res) => {
  const userId = req.user?.id;
  try {
    const { rows } = await db.query(
      `SELECT p.*,
              u.username, u.full_name, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM post_likes WHERE post_id=p.id) AS like_count,
              (SELECT COUNT(*) FROM comments
               WHERE post_id=p.id AND is_deleted=FALSE)            AS comment_count,
              ($2::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM post_likes
               WHERE post_id=p.id AND user_id=$2))                 AS is_liked,
              ($2::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM saved_posts
               WHERE post_id=p.id AND user_id=$2))                 AS is_saved,
              (SELECT json_agg(pm ORDER BY pm.position)
               FROM post_media pm WHERE pm.post_id=p.id)           AS media
       FROM posts p
       JOIN users u ON u.id=p.user_id
       WHERE p.id=$1 AND p.is_archived=FALSE`,
      [req.params.id, userId||null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found.' });
    db.query('UPDATE posts SET view_count=view_count+1 WHERE id=$1',
             [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load post.' });
  }
};

// ─── DELETE /api/posts/:id ──────────────────────────────────
exports.deletePost = async (req, res) => {
  const { rows } = await db.query(
    'SELECT user_id FROM posts WHERE id=$1', [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Post not found.' });
  if (rows[0].user_id !== req.user.id)
    return res.status(403).json({ error: 'Not your post.' });
  await db.query('DELETE FROM posts WHERE id=$1', [req.params.id]);
  res.json({ message: 'Post deleted.' });
};

// ─── POST /api/posts/:id/like ───────────────────────────────
exports.likePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const { rows: [post] } = await db.query(
      'SELECT user_id FROM posts WHERE id=$1', [id]
    );
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    await db.query(
      'INSERT INTO post_likes (post_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [id, userId]
    );
    if (post.user_id !== userId) {
      await db.query(
        `INSERT INTO notifications
           (recipient_id, actor_id, type, post_id)
         VALUES ($1,$2,'like_post',$3)`,
        [post.user_id, userId, id]
      );
    }
    const { rows:[{count}] } = await db.query(
      'SELECT COUNT(*) FROM post_likes WHERE post_id=$1', [id]
    );
    res.json({ liked: true, likeCount: parseInt(count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Like failed.' });
  }
};

// ─── DELETE /api/posts/:id/like ─────────────────────────────
exports.unlikePost = async (req, res) => {
  await db.query(
    'DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  const { rows:[{count}] } = await db.query(
    'SELECT COUNT(*) FROM post_likes WHERE post_id=$1', [req.params.id]
  );
  res.json({ liked: false, likeCount: parseInt(count) });
};

// ─── POST /api/posts/:id/save ───────────────────────────────
exports.savePost = async (req, res) => {
  await db.query(
    'INSERT INTO saved_posts (user_id,post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.user.id, req.params.id]
  );
  res.json({ saved: true });
};

// ─── DELETE /api/posts/:id/save ─────────────────────────────
exports.unsavePost = async (req, res) => {
  await db.query(
    'DELETE FROM saved_posts WHERE user_id=$1 AND post_id=$2',
    [req.user.id, req.params.id]
  );
  res.json({ saved: false });
};

// ─── GET /api/posts/explore ─────────────────────────────────
exports.explore = async (req, res) => {
  const userId = req.user?.id;
  const limit  = Math.min(parseInt(req.query.limit || '30'), 60);
  const offset = parseInt(req.query.offset || '0');
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.type, p.created_at,
              u.username, u.avatar_url, u.is_verified,
              (SELECT COUNT(*) FROM post_likes
               WHERE post_id=p.id) AS like_count,
              (SELECT pm.thumbnail_url FROM post_media pm
               WHERE pm.post_id=p.id ORDER BY position LIMIT 1) AS thumbnail
       FROM posts p
       JOIN users u ON u.id=p.user_id
       WHERE p.is_archived=FALSE
         AND u.is_private=FALSE AND u.is_active=TRUE
         AND ($1::uuid IS NULL OR p.user_id NOT IN (
               SELECT blocked_id FROM user_blocks WHERE blocker_id=$1))
       ORDER BY like_count DESC, p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId||null, limit, offset]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Explore failed.' });
  }
};

// ─── GET /api/posts/hashtag/:tag ────────────────────────────
exports.getByHashtag = async (req, res) => {
  const { tag } = req.params;
  const limit   = Math.min(parseInt(req.query.limit || '30'), 60);
  const offset  = parseInt(req.query.offset || '0');
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.type, p.created_at, u.username, u.avatar_url,
              (SELECT COUNT(*) FROM post_likes WHERE post_id=p.id) AS like_count,
              (SELECT pm.thumbnail_url FROM post_media pm
               WHERE pm.post_id=p.id ORDER BY position LIMIT 1) AS thumbnail
       FROM posts p
       JOIN post_hashtags ph ON ph.post_id=p.id
       JOIN hashtags h ON h.id=ph.hashtag_id
       JOIN users u ON u.id=p.user_id
       WHERE h.name=$1 AND p.is_archived=FALSE AND u.is_active=TRUE
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tag.toLowerCase(), limit, offset]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Hashtag load failed.' });
  }
};