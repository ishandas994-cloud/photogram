import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { commentsAPI } from '../../api';
import Avatar from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { timeAgo } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Comment = ({ comment, onDelete, postOwnerId }) => {
  const { user } = useAuth();
  const [showReplies, setShowReplies]   = useState(false);
  const [replies,     setReplies]       = useState([]);
  const [loadingR,    setLoadingR]      = useState(false);
  const [replyText,   setReplyText]     = useState('');
  const [showInput,   setShowInput]     = useState(false);
  const [liked,       setLiked]         = useState(comment.is_liked);
  const [likeCount,   setLikeCount]     = useState(+comment.like_count || 0);

  const canDelete = user?.id === comment.user_id || user?.id === postOwnerId;

  const loadReplies = async () => {
    if (showReplies) { setShowReplies(false); return; }
    setLoadingR(true);
    try {
      const { data } = await commentsAPI.getReplies(comment.id);
      setReplies(data);
      setShowReplies(true);
    } catch { toast.error('Failed to load replies'); }
    finally  { setLoadingR(false); }
  };

  const handleLike = async () => {
    const was = liked;
    setLiked(!was);
    setLikeCount(c => was ? c - 1 : c + 1);
    try {
      if (was) await commentsAPI.unlikeComment(comment.id);
      else     await commentsAPI.likeComment(comment.id);
    } catch {
      setLiked(was);
      setLikeCount(c => was ? c + 1 : c - 1);
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      const { data } = await commentsAPI.addComment(comment.post_id, {
        text: replyText.trim(), parent_id: comment.id,
      });
      setReplies(r => [...r, data]);
      setReplyText('');
      setShowReplies(true);
      setShowInput(false);
    } catch { toast.error('Failed to post reply'); }
  };

  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
      <Link to={`/profile/${comment.username}`}>
        <Avatar user={{ username: comment.username, avatar_url: comment.avatar_url }} size="xs" />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13 }}>
          <Link to={`/profile/${comment.username}`} style={{ fontWeight: 600, marginRight: 6 }}>
            {comment.username}
          </Link>
          {comment.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{timeAgo(comment.created_at)}</span>
          {likeCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
          <button onClick={() => setShowInput(s => !s)} style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>Reply</button>
          {canDelete && (
            <button onClick={() => onDelete(comment.id)} style={{ fontSize: 11, color: 'var(--accent)' }}>Delete</button>
          )}
        </div>

        {showInput && (
          <form onSubmit={submitReply} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              className="input"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={`Reply to @${comment.username}…`}
              style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
              autoFocus
            />
            <button type="submit" disabled={!replyText.trim()} style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>Post</button>
          </form>
        )}

        {+comment.reply_count > 0 && (
          <button onClick={loadReplies} style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {loadingR ? <Spinner size={12} /> : '—'}
            {showReplies ? 'Hide replies' : `View ${comment.reply_count} ${+comment.reply_count === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {showReplies && replies.map(r => (
          <div key={r.id} style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Avatar user={{ username: r.username, avatar_url: r.avatar_url }} size="xs" />
              <div>
                <div style={{ fontSize: 12 }}>
                  <Link to={`/profile/${r.username}`} style={{ fontWeight: 600, marginRight: 5 }}>{r.username}</Link>
                  {r.text}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{timeAgo(r.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleLike} style={{ fontSize: 14, color: liked ? 'var(--accent)' : 'var(--text-3)', alignSelf: 'flex-start', paddingTop: 2 }}>
        {liked ? '♥' : '♡'}
      </button>
    </div>
  );
};

const CommentSection = ({ postId, postOwnerId }) => {
  const { user }                      = useAuth();
  const [comments,  setComments]      = useState([]);
  const [loading,   setLoading]       = useState(true);
  const [text,      setText]          = useState('');
  const [posting,   setPosting]       = useState(false);

  useEffect(() => {
    commentsAPI.getComments(postId, { limit: 30 })
      .then(({ data }) => setComments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  const handleDelete = async (id) => {
    try {
      await commentsAPI.deleteComment(id);
      setComments(c => c.filter(x => x.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const { data } = await commentsAPI.addComment(postId, { text: text.trim() });
      setComments(c => [...c, data]);
      setText('');
    } catch { toast.error('Failed to post comment'); }
    finally  { setPosting(false); }
  };

  if (loading) return <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}><Spinner /></div>;

  return (
    <div>
      {comments.length === 0 && (
        <p style={{ color: 'var(--text-3)', fontSize: 14, padding: '16px 0', textAlign: 'center' }}>No comments yet. Be the first!</p>
      )}

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {comments.map(c => (
          <Comment key={c.id} comment={c} onDelete={handleDelete} postOwnerId={postOwnerId} />
        ))}
      </div>

      {user && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <Avatar user={user} size="xs" />
          <input
            className="input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment…"
            style={{ flex: 1, fontSize: 13, border: 'none', background: 'transparent', padding: '4px 0' }}
            maxLength={2200}
          />
          {text.trim() && (
            <button type="submit" disabled={posting} style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 13 }}>
              {posting ? <Spinner size={14} /> : 'Post'}
            </button>
          )}
        </form>
      )}
    </div>
  );
};

export default CommentSection;