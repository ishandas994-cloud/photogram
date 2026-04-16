const db = require('../config/db');

// ─── GET /api/posts/:id/comments ───────────────────────────
exports.getComments = async (req, res) => {
  const { id: postId } = req.params;
  const viewerId = req.user?.id;
  const limit    = Math.min(parseInt(req.query.limit || '20'), 50);
  const offset   = parseInt(req.query.offset || '0');

  try {
    const { rows } = await db.query(
      `SELECT
         c.id, c.post_id, c.parent_id, c.text,
         c.like_count, c.created_at, c.is_deleted,
         u.id AS user_id, u.username, u.avatar_url, u.is_verified,
         ($2::uuid IS NOT NULL AND EXISTS(
           SELECT 1 FROM comment_likes
           WHERE comment_id=c.id AND user_id=$2
         )) AS is_liked,
         (SELECT COUNT(*) FROM comments r
          WHERE r.parent_id=c.id AND r.is_deleted=FALSE) AS reply_count
       FROM comments c
       JOIN users u ON u.id=c.user_id
       WHERE c.post_id=$1
         AND c.parent_id IS NULL
         AND c.is_deleted=FALSE
       ORDER BY c.created_at ASC
       LIMIT $3 OFFSET $4`,
      [postId, viewerId||null, limit, offset]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load comments.' });
  }
};

// ─── POST /api/posts/:id/comments ──────────────────────────
exports.addComment = async (req, res) => {
  const { id: postId } = req.params;
  const { text, parent_id } = req.body;
  const userId = req.user.id;

  if (!text?.trim())
    return res.status(400).json({ error: 'Comment text required.' });

  try {
    const { rows:[post] } = await db.query(
      'SELECT user_id, comments_off FROM posts WHERE id=$1', [postId]
    );
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.comments_off)
      return res.status(403).json({ error: 'Comments are disabled.' });

    const { rows:[comment] } = await db.query(
      `INSERT INTO comments (post_id, user_id, parent_id, text)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [postId, userId, parent_id||null, text.trim()]
    );

    if (post.user_id !== userId) {
      await db.query(
        `INSERT INTO notifications
           (recipient_id, actor_id, type, post_id, comment_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [post.user_id, userId,
         parent_id ? 'reply' : 'comment',
         postId, comment.id]
      );
    }

    const { rows:[user] } = await db.query(
      'SELECT username, avatar_url, is_verified FROM users WHERE id=$1',
      [userId]
    );

    res.status(201).json({
      ...comment, ...user, is_liked: false, reply_count: 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Comment failed.' });
  }
};

// ─── DELETE /api/comments/:id ───────────────────────────────
exports.deleteComment = async (req, res) => {
  const { rows:[c] } = await db.query(
    'SELECT user_id, post_id FROM comments WHERE id=$1', [req.params.id]
  );
  if (!c) return res.status(404).json({ error: 'Comment not found.' });

  const { rows:[post] } = await db.query(
    'SELECT user_id FROM posts WHERE id=$1', [c.post_id]
  );
  const isOwner = c.user_id===req.user.id || post?.user_id===req.user.id;
  if (!isOwner)
    return res.status(403).json({ error: 'Permission denied.' });

  await db.query(
    'UPDATE comments SET is_deleted=TRUE WHERE id=$1', [req.params.id]
  );
  res.json({ message: 'Comment deleted.' });
};

// ─── POST /api/comments/:id/like ───────────────────────────
exports.likeComment = async (req, res) => {
  const { id } = req.params;
  await db.query(
    'INSERT INTO comment_likes (comment_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [id, req.user.id]
  );
  await db.query(
    'UPDATE comments SET like_count=like_count+1 WHERE id=$1', [id]
  );
  res.json({ liked: true });
};

// ─── DELETE /api/comments/:id/like ─────────────────────────
exports.unlikeComment = async (req, res) => {
  const { id } = req.params;
  await db.query(
    'DELETE FROM comment_likes WHERE comment_id=$1 AND user_id=$2',
    [id, req.user.id]
  );
  await db.query(
    'UPDATE comments SET like_count=GREATEST(like_count-1,0) WHERE id=$1', [id]
  );
  res.json({ liked: false });
};

// ─── GET /api/comments/:id/replies ─────────────────────────
exports.getReplies = async (req, res) => {
  const { id: parentId } = req.params;
  const viewerId = req.user?.id;
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.username, u.avatar_url, u.is_verified,
              ($2::uuid IS NOT NULL AND EXISTS(
                SELECT 1 FROM comment_likes
                WHERE comment_id=c.id AND user_id=$2
              )) AS is_liked
       FROM comments c
       JOIN users u ON u.id=c.user_id
       WHERE c.parent_id=$1 AND c.is_deleted=FALSE
       ORDER BY c.created_at ASC`,
      [parentId, viewerId||null]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load replies.' });
  }
};