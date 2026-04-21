const db = require('../config/db');
const { processImage } = require('../middleware/upload');

// ─── GET /api/conversations ─────────────────────────────────
exports.getConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT
         c.id, c.name, c.is_group, c.created_at,
         (SELECT json_agg(json_build_object(
           'user_id',    cm2.user_id,
           'username',   u2.username,
           'avatar_url', u2.avatar_url,
           'is_verified',u2.is_verified
         ))
          FROM conversation_members cm2
          JOIN users u2 ON u2.id=cm2.user_id
          WHERE cm2.conversation_id=c.id AND cm2.user_id<>$1
         ) AS members,
         (SELECT json_build_object(
           'id',        m.id,
           'type',      m.type,
           'content',   m.content,
           'sender_id', m.sender_id,
           'created_at',m.created_at
         )
          FROM messages m
          WHERE m.conversation_id=c.id AND m.is_deleted=FALSE
          ORDER BY m.created_at DESC LIMIT 1
         ) AS last_message,
         (SELECT COUNT(*)
          FROM messages m2
          WHERE m2.conversation_id=c.id
            AND m2.created_at > cm.last_read_at
            AND m2.sender_id<>$1
            AND m2.is_deleted=FALSE
         ) AS unread_count
       FROM conversation_members cm
       JOIN conversations c ON c.id=cm.conversation_id
       WHERE cm.user_id=$1
       ORDER BY (
         SELECT MAX(created_at) FROM messages
         WHERE conversation_id=c.id
       ) DESC NULLS LAST`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load conversations.' });
  }
};

// ─── POST /api/conversations ────────────────────────────────
exports.createConversation = async (req, res) => {
  const { recipient_id, recipient_ids, name } = req.body;
  const userId = req.user.id;

  const participants = recipient_id
    ? [userId, recipient_id]
    : [userId, ...(recipient_ids || [])];
  const isGroup = participants.length > 2;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1-to-1: reuse existing conversation
    if (!isGroup) {
      const other = participants.find(id => id !== userId);
      const { rows:existing } = await client.query(
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1
           ON cm1.conversation_id=c.id AND cm1.user_id=$1
         JOIN conversation_members cm2
           ON cm2.conversation_id=c.id AND cm2.user_id=$2
         WHERE c.is_group=FALSE LIMIT 1`,
        [userId, other]
      );
      if (existing[0]) {
        await client.query('COMMIT');
        return res.json(existing[0]);
      }
    }

    const { rows:[conv] } = await client.query(
      'INSERT INTO conversations (name,is_group,created_by) VALUES ($1,$2,$3) RETURNING *',
      [name||null, isGroup, userId]
    );
    for (const uid of participants) {
      await client.query(
        'INSERT INTO conversation_members (conversation_id,user_id,role) VALUES ($1,$2,$3)',
        [conv.id, uid, uid===userId ? 'admin' : 'member']
      );
    }
    await client.query('COMMIT');
    res.status(201).json(conv);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Conversation creation failed.' });
  } finally {
    client.release();
  }
};

// ─── GET /api/conversations/:id/messages ────────────────────
exports.getMessages = async (req, res) => {
  const { id: convId } = req.params;
  const userId = req.user.id;
  const limit  = Math.min(parseInt(req.query.limit || '30'), 100);
  const cursor = req.query.cursor;

  const { rows:[member] } = await db.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',
    [convId, userId]
  );
  if (!member)
    return res.status(403).json({ error: 'Not a member of this conversation.' });

  try {
    const { rows } = await db.query(
      `SELECT m.*, u.username, u.avatar_url
       FROM messages m
       JOIN users u ON u.id=m.sender_id
       WHERE m.conversation_id=$1
         AND ($3::timestamptz IS NULL OR m.created_at < $3)
         AND m.is_deleted=FALSE
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [convId, limit, cursor||null]
    );

    await db.query(
      'UPDATE conversation_members SET last_read_at=NOW() WHERE conversation_id=$1 AND user_id=$2',
      [convId, userId]
    );

    const nextCursor = rows.length===limit
      ? rows[rows.length-1].created_at : null;
    res.json({ messages: rows.reverse(), nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load messages.' });
  }
};

// ─── POST /api/conversations/:id/messages ───────────────────
exports.sendMessage = async (req, res) => {
  const { id: convId } = req.params;
  const { content }    = req.body;
  const userId         = req.user.id;

  try {
    // Check membership
    const { rows: [member] } = await db.query(
      'SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',
      [convId, userId]
    );
    if (!member) return res.status(403).json({ error: 'Not a member.' });

    if (!content?.trim()) return res.status(400).json({ error: 'Message is empty.' });

    // Insert message
    const { rows: [message] } = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, type, content)
       VALUES ($1, $2, 'text', $3) RETURNING *`,
      [convId, userId, content.trim()]
    );

    // Get sender info
    const { rows: [sender] } = await db.query(
      'SELECT username, avatar_url FROM users WHERE id=$1', [userId]
    );

    const full = { ...message, username: sender.username, avatar_url: sender.avatar_url };

    // Real-time emit
    req.app.get('io')?.to(convId).emit('new_message', full);

    res.status(201).json(full);
  } catch (err) {
    console.error('sendMessage error:', err.message);
    res.status(500).json({ error: 'Message send failed.' });
  }
};

// ─── DELETE /api/conversations/messages/:msgId ──────────────
exports.deleteMessage = async (req, res) => {
  const { rows:[m] } = await db.query(
    'SELECT sender_id FROM messages WHERE id=$1', [req.params.id]
  );
  if (!m) return res.status(404).json({ error: 'Message not found.' });
  if (m.sender_id !== req.user.id)
    return res.status(403).json({ error: 'Not your message.' });

  await db.query(
    'UPDATE messages SET is_deleted=TRUE WHERE id=$1', [req.params.id]
  );
  req.app.get('io')?.emit('message_deleted', { id: req.params.id });
  res.json({ message: 'Message deleted.' });
}