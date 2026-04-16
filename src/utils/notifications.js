const db = require('../config/db');

/**
 * Creates a notification in the DB and emits it via Socket.io if recipient is online.
 *
 * @param {object} opts
 * @param {import('socket.io').Server} opts.io        - Socket.io server instance
 * @param {string}  opts.recipientId                  - UUID of user to notify
 * @param {string}  opts.actorId                      - UUID of user who triggered the action
 * @param {string}  opts.type                         - Notification type string
 * @param {string}  [opts.postId]
 * @param {string}  [opts.commentId]
 * @param {string}  [opts.storyId]
 */
const createNotification = async ({ io, recipientId, actorId, type, postId, commentId, storyId }) => {
  // Never notify yourself
  if (recipientId === actorId) return;

  try {
    const { rows: [notif] } = await db.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, post_id, comment_id, story_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [recipientId, actorId, type, postId || null, commentId || null, storyId || null]
    );

    // Attach actor info for real-time payload
    const { rows: [actor] } = await db.query(
      `SELECT username, avatar_url, is_verified FROM users WHERE id = $1`, [actorId]
    );

    if (io?.sendNotification) {
      io.sendNotification(recipientId, { ...notif, actor });
    }

    return notif;
  } catch (err) {
    // Notifications are non-critical — log but don't throw
    console.error('Notification error:', err.message);
  }
};

/**
 * Notification type constants — import these instead of hardcoding strings.
 */
const NOTIF = {
  LIKE_POST:        'like_post',
  LIKE_COMMENT:     'like_comment',
  COMMENT:          'comment',
  REPLY:            'reply',
  FOLLOW:           'follow',
  FOLLOW_REQUEST:   'follow_request',
  FOLLOW_ACCEPT:    'follow_accept',
  MENTION_POST:     'mention_post',
  MENTION_COMMENT:  'mention_comment',
  TAG_POST:         'tag_post',
  STORY_REACTION:   'story_reaction',
  MESSAGE:          'message',
};

module.exports = { createNotification, NOTIF };