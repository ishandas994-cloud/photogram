import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI, commentsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { getMediaUrl, formatCount, timeAgo } from '../utils/helpers';
import toast from 'react-hot-toast';

// ── Like animation ──────────────────────────────────────────
const LikeFloat = ({ x, y, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 900); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: 'absolute', left: x - 30, top: y - 30,
      fontSize: 56, pointerEvents: 'none', zIndex: 100,
      animation: 'likeFloat .9s ease forwards',
    }}>❤️</div>
  );
};

// ── Comment drawer ──────────────────────────────────────────
const CommentDrawer = ({ post, onClose }) => {
  const { user }                     = useAuth();
  const [comments, setComments]      = useState([]);
  const [text,     setText]          = useState('');
  const [loading,  setLoading]       = useState(true);

  useEffect(() => {
    commentsAPI.getComments(post.id, { limit: 30 })
      .then(({ data }) => setComments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [post.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { data } = await commentsAPI.addComment(post.id, { text: text.trim() });
      setComments(c => [...c, data]);
      setText('');
    } catch { toast.error('Failed to post'); }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 20 }} />

      {/* Drawer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '65%', zIndex: 21,
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp .3s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-2)' }} />
        </div>

        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>Comments</span>
          <button onClick={onClose} style={{ color: 'var(--text-3)', fontSize: 20 }}>✕</button>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>
              No comments yet. Be first!
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <Avatar user={{ username: c.username, avatar_url: c.avatar_url }} size="sm" />
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', marginRight: 6 }}>{c.username}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{c.text}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{timeAgo(c.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        {user && (
          <form onSubmit={submit} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <Avatar user={user} size="sm" />
            <input
              className="input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a comment…"
              style={{ flex: 1, fontSize: 13, borderRadius: 20 }}
            />
            {text.trim() && (
              <button type="submit" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>Post</button>
            )}
          </form>
        )}
      </div>
    </>
  );
};

// ── Single reel ─────────────────────────────────────────────
const ReelItem = ({ post, isActive }) => {
  const { user }                     = useAuth();
  const videoRef                     = useRef(null);
  const [playing,   setPlaying]      = useState(false);
  const [muted,     setMuted]        = useState(true);
  const [liked,     setLiked]        = useState(post.is_liked);
  const [likes,     setLikes]        = useState(parseInt(post.like_count) || 0);
  const [saved,     setSaved]        = useState(post.is_saved);
  const [showComments, setShowComments] = useState(false);
  const [likeAnims, setLikeAnims]    = useState([]);
  const [progress,  setProgress]     = useState(0);
  const [caption,   setCaption]      = useState(false);

  const media = post.media?.[0];
  const isVideo = media?.media_type === 'video';
  const src = getMediaUrl(media?.media_url || media?.thumbnail_url);

  // Auto play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  // Progress bar
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;
    const update = () => setProgress((video.currentTime / video.duration) * 100 || 0);
    video.addEventListener('timeupdate', update);
    return () => video.removeEventListener('timeupdate', update);
  }, [isVideo]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); }
    else              { video.pause(); setPlaying(false); }
  };

  const handleDoubleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!liked) {
      setLiked(true);
      setLikes(l => l + 1);
      import('../api').then(m => m.postsAPI.likePost(post.id)).catch(() => {});
    }
    const id = Date.now();
    setLikeAnims(prev => [...prev, { id, x, y }]);
  };

  const handleLike = async () => {
    const was = liked;
    setLiked(!was);
    setLikes(l => was ? l - 1 : l + 1);
    try {
      if (was) await import('../api').then(m => m.postsAPI.unlikePost(post.id));
      else     await import('../api').then(m => m.postsAPI.likePost(post.id));
    } catch {
      setLiked(was);
      setLikes(l => was ? l + 1 : l - 1);
    }
  };

  const handleSave = async () => {
    const was = saved;
    setSaved(!was);
    try {
      if (was) await import('../api').then(m => m.postsAPI.unsavePost(post.id));
      else     await import('../api').then(m => m.postsAPI.savePost(post.id));
    } catch { setSaved(was); }
  };

  return (
    <div className="reel-item">
      {/* Video / Image */}
      <div
        style={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer' }}
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={src}
            loop
            muted={muted}
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}

        {/* Progress bar */}
        {isVideo && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,.2)' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#fff', transition: 'width .1s linear' }} />
          </div>
        )}

        {/* Play/pause indicator */}
        {!playing && isVideo && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(0,0,0,.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>▶</div>
          </div>
        )}

        {/* Like float animations */}
        {likeAnims.map(a => (
          <LikeFloat key={a.id} x={a.x} y={a.y} onDone={() => setLikeAnims(p => p.filter(x => x.id !== a.id))} />
        ))}
      </div>

      {/* Bottom info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 80,
        padding: '20px 16px 32px',
        background: 'linear-gradient(transparent, rgba(0,0,0,.8))',
        pointerEvents: 'none',
      }}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, pointerEvents: 'all' }}>
          <Link to={`/profile/${post.username}`}>
            <Avatar user={{ username: post.username, avatar_url: post.avatar_url }} size="sm" />
          </Link>
          <Link to={`/profile/${post.username}`} style={{ color: '#fff', fontWeight: 700, fontSize: 15, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
            @{post.username}
          </Link>
          {post.is_verified && <span style={{ color: '#60cdff', fontSize: 13 }}>✓</span>}
        </div>

        {/* Caption */}
        {post.caption && (
          <div style={{ pointerEvents: 'all' }}>
            <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.5, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
              {caption || post.caption.length <= 80
                ? post.caption
                : post.caption.slice(0, 80) + '… '}
              {post.caption.length > 80 && (
                <button onClick={() => setCaption(c => !c)} style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>
                  {caption ? 'less' : 'more'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right action buttons */}
      <div style={{
        position: 'absolute', right: 12, bottom: 80,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 24,
      }}>

        {/* Like */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleLike}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(0,0,0,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, border: 'none', cursor: 'pointer',
              color: liked ? '#e63946' : '#fff',
              animation: liked ? 'heartPop .35s ease' : 'none',
              transition: 'color .15s, transform .15s',
              backdropFilter: 'blur(4px)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {liked ? '♥' : '♡'}
          </button>
          <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginTop: 4, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
            {formatCount(likes)}
          </div>
        </div>

        {/* Comment */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(0,0,0,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, border: 'none', cursor: 'pointer', color: '#fff',
              backdropFilter: 'blur(4px)',
              transition: 'transform .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            💬
          </button>
          <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginTop: 4, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
            {formatCount(post.comment_count)}
          </div>
        </div>

        {/* Save */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(0,0,0,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, border: 'none', cursor: 'pointer',
              color: saved ? '#f4a261' : '#fff',
              backdropFilter: 'blur(4px)',
              transition: 'transform .15s, color .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {saved ? '🔖' : '⊹'}
          </button>
          <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginTop: 4, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
            Save
          </div>
        </div>

        {/* Mute/Unmute */}
        {isVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(0,0,0,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, border: 'none', cursor: 'pointer', color: '#fff',
              backdropFilter: 'blur(4px)',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}
      </div>

      {/* Comments drawer */}
      {showComments && (
        <CommentDrawer post={post} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
};

// ── Main Reels Page ─────────────────────────────────────────
const ReelsPage = () => {
  const [reels,      setReels]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeIdx,  setActiveIdx]  = useState(0);
  const containerRef = useRef(null);
  const observerRef  = useRef(null);

  useEffect(() => {
    postsAPI.getExplore({ limit: 20 })
      .then(({ data }) => {
        const videoReels = data.filter(p => {
          const m = p.media?.[0] || p;
          return m.media_type === 'video' || m.thumbnail;
        });
        setReels(videoReels.length > 0 ? videoReels : data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // IntersectionObserver to track which reel is active
  useEffect(() => {
    if (!reels.length) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.idx);
            setActiveIdx(idx);
          }
        });
      },
      { threshold: 0.6 }
    );
    document.querySelectorAll('.reel-item').forEach(el => {
      observerRef.current.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [reels]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      const container = containerRef.current;
      if (!container) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const next = Math.min(activeIdx + 1, reels.length - 1);
        container.children[next]?.scrollIntoView({ behavior: 'smooth' });
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prev = Math.max(activeIdx - 1, 0);
        container.children[prev]?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIdx, reels]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <Spinner size={32} color="#fff" />
    </div>
  );

  if (!reels.length) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🎬</div>
      <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>No reels yet</div>
      <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>Post videos to see them here</div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="reels-container"
      style={{ position: 'relative' }}
    >
      {reels.map((post, i) => (
        <div key={post.id} data-idx={i} className="reel-item">
          <ReelItem post={post} isActive={i === activeIdx} />
        </div>
      ))}

      {/* Navigation hints */}
      <div style={{
        position: 'fixed', right: 80, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 5, pointerEvents: 'none',
      }}>
        {reels.map((_, i) => (
          <div key={i} style={{
            width: 4, height: i === activeIdx ? 20 : 8,
            borderRadius: 2,
            background: i === activeIdx ? '#fff' : 'rgba(255,255,255,.35)',
            transition: 'all .3s ease',
          }} />
        ))}
      </div>
    </div>
  );
};

export default ReelsPage;
