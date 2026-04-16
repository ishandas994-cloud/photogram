
require('dotenv').config();
const db = require('./db');

const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(30)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  full_name     VARCHAR(100),
  bio           TEXT,
  avatar_url    TEXT,
  website       TEXT,
  is_private    BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FOLLOWS
CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(10) NOT NULL DEFAULT 'accepted'
               CHECK (status IN ('pending','accepted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- POSTS
CREATE TABLE IF NOT EXISTS posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption      TEXT,
  location     VARCHAR(100),
  type         VARCHAR(10) NOT NULL DEFAULT 'image'
               CHECK (type IN ('image','carousel','reel')),
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  comments_off BOOLEAN NOT NULL DEFAULT FALSE,
  likes_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  view_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- POST MEDIA
CREATE TABLE IF NOT EXISTS post_media (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type    VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video')),
  width         INTEGER,
  height        INTEGER,
  duration_sec  NUMERIC(8,2),
  position      SMALLINT NOT NULL DEFAULT 0
);

-- HASHTAGS
CREATE TABLE IF NOT EXISTS hashtags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) UNIQUE NOT NULL,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id    UUID NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

-- POST LIKES
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  parent_id  UUID          REFERENCES comments(id) ON DELETE CASCADE,
  text       TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2200),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- SAVED POSTS
CREATE TABLE IF NOT EXISTS saved_posts (
  user_id    UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- STORIES
CREATE TABLE IF NOT EXISTS stories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type    VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video')),
  duration_sec  NUMERIC(5,2) NOT NULL DEFAULT 5,
  caption       TEXT,
  link          TEXT,
  is_highlight  BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_views (
  story_id  UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

-- CONVERSATIONS (DMs)
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100),
  is_group   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL DEFAULT 'member',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  type            VARCHAR(10) NOT NULL DEFAULT 'text',
  content         TEXT,
  media_url       TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     UUID          REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(30)   NOT NULL,
  post_id      UUID          REFERENCES posts(id)    ON DELETE CASCADE,
  comment_id   UUID          REFERENCES comments(id) ON DELETE CASCADE,
  story_id     UUID          REFERENCES stories(id)  ON DELETE CASCADE,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BLOCKS & MUTES
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);
`;

async function migrate() {
  console.log('Running migrations...');
  try {
    await db.query(schema);
    console.log('All tables created.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

migrate();