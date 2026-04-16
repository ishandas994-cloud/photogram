require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./db');

async function seed() {
  console.log('🌱  Seeding database…');
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Users ───────────────────────────────────────────────
    const password = await bcrypt.hash('password123', 12);

    const users = [
      { username: 'alex_photo',   email: 'alex@demo.com',   full_name: 'Alex Rivera',    bio: 'Travel & street photographer 📷'  },
      { username: 'maya_designs', email: 'maya@demo.com',   full_name: 'Maya Patel',     bio: 'UI designer | Coffee addict ☕'   },
      { username: 'john_dev',     email: 'john@demo.com',   full_name: 'John Smith',     bio: 'Full-stack dev 💻 building things' },
      { username: 'sara_art',     email: 'sara@demo.com',   full_name: 'Sara Chen',      bio: 'Digital artist & illustrator 🎨'  },
      { username: 'mike_travels', email: 'mike@demo.com',   full_name: 'Mike Johnson',   bio: 'Exploring the world 🌍'           },
    ];

    const insertedUsers = [];
    for (const u of users) {
      const { rows } = await client.query(
        `INSERT INTO users (username, email, password_hash, full_name, bio, is_verified)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (username) DO UPDATE SET bio = EXCLUDED.bio
         RETURNING id, username`,
        [u.username, u.email, password, u.full_name, u.bio, Math.random() > 0.6]
      );
      insertedUsers.push(rows[0]);
      console.log(`  👤  User: @${rows[0].username}`);
    }

    // ── 2. Follows ──────────────────────────────────────────────
    const followPairs = [
      [0,1],[0,2],[0,3],[1,0],[1,2],[2,0],[2,3],[2,4],[3,1],[3,4],[4,0],[4,2]
    ];
    for (const [fi, gi] of followPairs) {
      await client.query(
        `INSERT INTO follows (follower_id, following_id, status)
         VALUES ($1,$2,'accepted') ON CONFLICT DO NOTHING`,
        [insertedUsers[fi].id, insertedUsers[gi].id]
      );
    }
    console.log(`  🤝  ${followPairs.length} follow relationships created`);

    // ── 3. Posts ────────────────────────────────────────────────
    const postData = [
      { userIdx: 0, caption: 'Golden hour in the mountains 🏔️ #travel #photography #landscape', type: 'image' },
      { userIdx: 1, caption: 'New UI concept drop — what do you think? #design #ux #figma',      type: 'image' },
      { userIdx: 2, caption: 'Finally shipped the feature 🚀 #coding #webdev #react',             type: 'image' },
      { userIdx: 3, caption: 'Digital portrait study. 6 hours of work 🎨 #art #digitalart',       type: 'image' },
      { userIdx: 4, caption: 'Santorini at sunrise — no filter needed 🇬🇷 #travel #greece',       type: 'image' },
      { userIdx: 0, caption: 'Street photography series #1 #streetphotography #city',             type: 'carousel' },
      { userIdx: 1, caption: 'Color palette exploration #design #colors',                         type: 'image' },
      { userIdx: 2, caption: 'My dev setup in 2025 💻 #coding #setup #developer',                 type: 'image' },
    ];

    const insertedPosts = [];
    for (const p of postData) {
      const { rows } = await client.query(
        `INSERT INTO posts (user_id, caption, type)
         VALUES ($1,$2,$3) RETURNING id`,
        [insertedUsers[p.userIdx].id, p.caption, p.type]
      );
      const postId = rows[0].id;
      insertedPosts.push(postId);

      // Attach a placeholder media entry
      await client.query(
        `INSERT INTO post_media (post_id, media_url, thumbnail_url, media_type, position)
         VALUES ($1,$2,$3,'image',0)`,
        [
          postId,
          `https://picsum.photos/seed/${postId}/1080/1080`,
          `https://picsum.photos/seed/${postId}/300/300`,
        ]
      );

      // Extract & insert hashtags
      const tags = [...new Set((p.caption.match(/#[a-zA-Z0-9_]+/g) || []).map(t => t.slice(1).toLowerCase()))];
      for (const name of tags) {
        const { rows: [tag] } = await client.query(
          `INSERT INTO hashtags (name, post_count) VALUES ($1,1)
           ON CONFLICT (name) DO UPDATE SET post_count = hashtags.post_count + 1
           RETURNING id`,
          [name]
        );
        await client.query(
          `INSERT INTO post_hashtags VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [postId, tag.id]
        );
      }
    }
    console.log(`  📸  ${insertedPosts.length} posts created`);

    // ── 4. Likes ────────────────────────────────────────────────
    let likeCount = 0;
    for (const postId of insertedPosts) {
      const likers = insertedUsers.filter(() => Math.random() > 0.4);
      for (const liker of likers) {
        await client.query(
          `INSERT INTO post_likes VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING`,
          [postId, liker.id]
        );
        likeCount++;
      }
    }
    console.log(`  ❤️   ${likeCount} likes created`);

    // ── 5. Comments ─────────────────────────────────────────────
    const commentTexts = [
      'This is absolutely stunning! 😍',
      'Love the composition here 🔥',
      'Goals! How did you achieve this look?',
      'Amazing work as always 👏',
      'The colors are incredible!',
      'This made my day 🙌',
    ];
    let commentCount = 0;
    for (const postId of insertedPosts.slice(0, 4)) {
      for (let i = 0; i < 3; i++) {
        const user = insertedUsers[Math.floor(Math.random() * insertedUsers.length)];
        const text = commentTexts[Math.floor(Math.random() * commentTexts.length)];
        await client.query(
          `INSERT INTO comments (post_id, user_id, text) VALUES ($1,$2,$3)`,
          [postId, user.id, text]
        );
        commentCount++;
      }
    }
    console.log(`  💬  ${commentCount} comments created`);

    // ── 6. Stories ──────────────────────────────────────────────
    for (const u of insertedUsers.slice(0, 3)) {
      await client.query(
        `INSERT INTO stories (user_id, media_url, thumbnail_url, media_type, caption)
         VALUES ($1,$2,$3,'image',$4)`,
        [
          u.id,
          `https://picsum.photos/seed/story-${u.id}/1080/1920`,
          `https://picsum.photos/seed/story-${u.id}/300/500`,
          'Living my best life ✨',
        ]
      );
    }
    console.log(`  📖  3 stories created`);

    // ── 7. Demo conversation ─────────────────────────────────────
    const { rows: [conv] } = await client.query(
      `INSERT INTO conversations (created_by, is_group)
       VALUES ($1, FALSE) RETURNING id`,
      [insertedUsers[0].id]
    );
    for (const u of [insertedUsers[0], insertedUsers[1]]) {
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1,$2)`,
        [conv.id, u.id]
      );
    }
    const demoMessages = [
      { sender: 0, text: 'Hey! Love your latest post 🔥' },
      { sender: 1, text: 'Thanks so much! Working on something new 👀' },
      { sender: 0, text: "Can't wait to see it!" },
    ];
    for (const m of demoMessages) {
      await client.query(
        `INSERT INTO messages (conversation_id, sender_id, content, type)
         VALUES ($1,$2,$3,'text')`,
        [conv.id, insertedUsers[m.sender].id, m.text]
      );
    }
    console.log(`  💌  Demo conversation seeded`);

    await client.query('COMMIT');
    console.log('\n✅  Seed complete!\n');
    console.log('Demo login credentials:');
    users.forEach(u => console.log(`  📧  ${u.email}  🔑  password123`));
    console.log();

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

seed();