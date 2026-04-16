import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI, commentsAPI } from '../../api';
import Avatar from '../ui/Avatar';
import { timeAgo, formatCount, getMediaUrl } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PostCard = ({ post: initialPost }) => {
  const [post,    setPost]    = useState(initialPost);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);

  const media = post.media || [];

  const handleLike = async () => {
    const wasLiked = post.is_liked;
    // Optimistic
    setPost(p => ({
      ...p,
      is_liked:   !wasLiked,
      like_count: wasLiked ? +p.like_count - 1 : +p.like_count + 1,
    }));
    try {
      if (wasLiked) await postsAPI.unlikePost(post.id);
      else          await postsAPI.likePost(post.id);
    } catch {
      // Revert
      setPost(p => ({ ...p, is_liked: wasLiked, like_count: wasLiked ? +p.like_count + 1 : +p.like_count - 1 }));
    }
  };

  const handleSave = async () => {
    const wasSaved = post.is_saved;
    setPost(p => ({ ...p, is_saved: !wasSaved }));
    try {
      if (wasSaved) await postsAPI.unsavePost(post.id);
      else          await postsAPI.savePost(post.id);
    } catch { setPost(p => ({ ...p, is_saved: wasSaved })); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await commentsAPI.addComment(post.id, { text: comment.trim() });
      setPost(p => ({ ...p, comment_count: +p.comment_count + 1 }));
      setComment('');
    } catch { toast.error('Failed to post comment'); }
    finally  { setPosting(false); }
  };

  const caption = post.caption || '';
  const shortCaption = caption.length > 120 ? caption.slice(0, 120) + '…' : caption;

  return (
    <article style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      animation: 'fadeIn .3s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
        <Link to={`/profile/${post.username}`}>
          <Avatar user={{ username: post.username, avatar_url: post.avatar_url }} size="sm" />
        </Link>
        <div style={{ flex: 1 }}>
          <Link to={`/profile/${post.username}`} style={{ fontWeight: 600, fontSize: 14 }}>
            {post.username}
          </Link>
          {post.is_verified && <span style={{ color: 'var(--blue)', marginLeft: 4, fontSize: 13 }}>✓</span>}
          {post.location && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{post.location}</div>}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{timeAgo(post.created_at)}</span>
      </div>

      {/* Media */}
{media.length > 0 && (
  <div style={{ position: 'relative', background: '#000' }}>
    {media[mediaIdx]?.media_type === 'video' ? (
      <video
        src={getMediaUrl(media[mediaIdx]?.media_url)}
        controls
        style={{ width: '100%', maxHeight: 520, display: 'block' }}
        onDoubleClick={handleLike}
      />
    ) : (
      <img
        src={getMediaUrl(media[mediaIdx]?.media_url)}
        alt="post"
        style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }}
        onDoubleClick={handleLike}
      />
    )}
          {/* Carousel dots */}
          {media.length > 1 && (
            <>
              <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                {media.map((_, i) => (
                  <div key={i} onClick={() => setMediaIdx(i)} style={{ width: 6, height: 6, borderRadius: '50%', background: i === mediaIdx ? '#fff' : 'rgba(255,255,255,.5)', cursor: 'pointer' }} />
                ))}
              </div>
              {mediaIdx > 0 && (
                <button onClick={() => setMediaIdx(i => i - 1)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>‹</button>
              )}
              {mediaIdx < media.length - 1 && (
                <button onClick={() => setMediaIdx(i => i + 1)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>›</button>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '10px 16px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <button onClick={handleLike} style={{
            fontSize: 22, transition: 'transform .15s',
            color: post.is_liked ? 'var(--accent)' : 'var(--text-1)',
            animation: post.is_liked ? 'heartPop .35s ease' : 'none',
          }}>
            {post.is_liked ? '♥' : '♡'}
          </button>
          <Link to={`/posts/${post.id}`} style={{ fontSize: 20, color: 'var(--text-1)' }}>💬</Link>
          <button style={{ fontSize: 20, color: 'var(--text-1)', marginLeft: 'auto' }} onClick={handleSave}>
            {post.is_saved ? '🔖' : '⊹'}
          </button>
        </div>

        {!post.likes_hidden && (
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {formatCount(post.like_count)} {+post.like_count === 1 ? 'like' : 'likes'}
          </div>
        )}

        {caption && (
          <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 4 }}>
            <Link to={`/profile/${post.username}`} style={{ fontWeight: 600, marginRight: 6 }}>{post.username}</Link>
            {showAll ? caption : shortCaption}
            {caption.length > 120 && (
              <button onClick={() => setShowAll(s => !s)} style={{ color: 'var(--text-3)', fontSize: 13, marginLeft: 4 }}>
                {showAll ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {+post.comment_count > 0 && (
          <Link to={`/posts/${post.id}`} style={{ fontSize: 13, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            View all {formatCount(post.comment_count)} comments
          </Link>
        )}

        {/* Quick comment */}
        {!post.comments_off && (
          <form onSubmit={submitComment} style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <input
              className="input"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment…"
              style={{ flex: 1, border: 'none', background: 'transparent', padding: '4px 0', fontSize: 13 }}
              maxLength={2200}
            />
            {comment.trim() && (
              <button type="submit" disabled={posting} style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 13 }}>
                {posting ? '…' : 'Post'}
              </button>
            )}
          </form>
        )}
      </div>
    </article>
  );
};

export default PostCard;