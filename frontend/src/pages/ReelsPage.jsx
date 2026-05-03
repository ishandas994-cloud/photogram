import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI, commentsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { formatCount, timeAgo } from '../utils/helpers';
import toast from 'react-hot-toast';

const getUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return 'http://localhost:5000' + url;
};

// ── Floating heart ───────────────────────────────────────────
const LikeFloat = ({ x, y, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 800); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: 'absolute', left: x - 30, top: y - 30,
      fontSize: 56, pointerEvents: 'none', zIndex: 99,
      animation: 'likeFloat .8s ease forwards',
    }}>❤️</div>
  );
};

// ── Comment drawer ───────────────────────────────────────────
const CommentDrawer = ({ post, onClose }) => {
  const { user }                = useAuth();
  const [comments, setComments] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);

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
    } catch { toast.error('Failed'); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 20 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '70%', zIndex: 21,
        background: '#1a1a1a',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp .3s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.3)' }} />
        </div>
        <div style={{ padding: '0 16px 10px', borderBottom: '1px solid rgba(255,255,255,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Comments</span>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,.6)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner color="#fff" /></div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>No comments yet</div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <Avatar user={{ username: c.username, avatar_url: c.avatar_url }} size="xs" />
                <div>
                  <span style={{ fontWeight: 600, fontSize: 12, color: '#fff', marginRight: 6 }}>{c.username}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.85)' }}>{c.text}</span>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{timeAgo(c.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        {user && (
          <form onSubmit={submit} style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Avatar user={user} size="xs" />
            <input
              value={text} onChange={e => setText(e.target.value)}
              placeholder="Add a comment…"
              style={{
                flex: 1, background: 'rgba(255,255,255,.1)', border: 'none',
                borderRadius: 20, padding: '8px 14px', color: '#fff',
                fontSize: 13, outline: 'none', fontFamily: 'var(--font)',
              }}
            />
            {text.trim() && (
              <button type="submit" style={{ color: '#60cdff', fontWeight: 600, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>Post</button>
            )}
          </form>
        )}
      </div>
    </>
  );
};

// ── Single Reel ──────────────────────────────────────────────
const ReelItem = ({ post, isActive }) => {
  const { user }        = useAuth();
  const videoRef        = useRef(null);
  const [playing,  setPlaying]      = useState(false);
  const [muted,    setMuted]        = useState(false); // sound ON by default
  const [liked,    setLiked]        = useState(post.is_liked);
  const [likes,    setLikes]        = useState(parseInt(post.like_count) || 0);
  const [saved,    setSaved]        = useState(post.is_saved);
  const [comments, setComments]     = useState(parseInt(post.comment_count) || 0);
  const [showComments, setShowComments] = useState(false);
  const [likeAnims,    setLikeAnims]    = useState([]);
  const [progress,     setProgress]     = useState(0);
  const [expanded,     setExpanded]     = useState(false);

  const media    = post.media?.[0];
  const isVideo  = media?.media_type === 'video';
  const mediaSrc = getUrl(media?.media_url);
  const thumbSrc = getUrl(media?.thumbnail_url);
  const fallback = `https://picsum.photos/seed/${post.id}/400/700`;

  // Auto play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.muted = muted;
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
      setProgress(0);
    }
  }, [isActive]);

  // Sync muted state to video
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Progress bar
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    const update = () => v.duration && setProgress((v.currentTime / v.duration) * 100);
    v.addEventListener('timeupdate', update);
    return () => v.removeEventListener('timeupdate', update);
  }, [isVideo]);

  const togglePlay = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  const handleDoubleTap = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!liked) {
      setLiked(true);
      setLikes(l => l + 1);
      postsAPI.likePost(post.id).catch(() => {});
    }
    setLikeAnims(p => [...p, { id: Date.now(), x, y }]);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    const was = liked;
    setLiked(!was); setLikes(l => was ? l-1 : l+1);
    try {
      if (was) await postsAPI.unlikePost(post.id);
      else     await postsAPI.likePost(post.id);
    } catch { setLiked(was); setLikes(l => was ? l+1 : l-1); }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    const was = saved; setSaved(!was);
    try {
      if (was) await postsAPI.unsavePost(post.id);
      else     await postsAPI.savePost(post.id);
    } catch { setSaved(was); }
  };

  const caption = post.caption || '';

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#000', overflow: 'hidden', borderRadius: 'inherit',
    }}>
      {/* Media */}
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
      >
        {isVideo && mediaSrc ? (
          <video
            ref={videoRef}
            src={mediaSrc}
            poster={thumbSrc || fallback}
            loop playsInline
            muted={muted}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <img
            src={mediaSrc || fallback}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.onerror = null; e.target.src = fallback; }}
          />
        )}
      </div>

      {/* Progress bar */}
      {isVideo && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,.2)', zIndex: 5 }}>
          <div style={{ height: '100%', background: '#fff', width: `${progress}%`, transition: 'width .1s linear' }} />
        </div>
      )}

      {/* Pause icon */}
      {!playing && isVideo && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, pointerEvents: 'none' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>▶</div>
        </div>
      )}

      {/* Heart float */}
      {likeAnims.map(a => (
        <LikeFloat key={a.id} x={a.x} y={a.y} onDone={() => setLikeAnims(p => p.filter(x => x.id !== a.id))} />
      ))}

      {/* Bottom gradient + user info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 60,
        padding: '60px 12px 16px',
        background: 'linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.2) 70%, transparent 100%)',
        zIndex: 3,
      }}>
        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link to={`/profile/${post.username}`} onClick={e => e.stopPropagation()}>
            <Avatar user={{ username: post.username, avatar_url: post.avatar_url }} size="sm" />
          </Link>
          <Link to={`/profile/${post.username}`} onClick={e => e.stopPropagation()}
            style={{ color: '#fff', fontWeight: 700, fontSize: 13, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>
            @{post.username}
          </Link>
          {post.is_verified && <span style={{ color: '#60cdff', fontSize: 12 }}>✓</span>}
        </div>

        {/* Caption */}
        {caption && (
          <p style={{ color: '#fff', fontSize: 12, lineHeight: 1.5, margin: 0, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>
            {expanded || caption.length <= 70 ? caption : caption.slice(0, 70) + '… '}
            {caption.length > 70 && (
              <button onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
                style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
                {expanded ? 'less' : 'more'}
              </button>
            )}
          </p>
        )}
      </div>

      {/* Right action buttons */}
      <div style={{
        position: 'absolute', right: 8, bottom: 60,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 18, zIndex: 5,
      }}>
        {/* Like */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleLike} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 28, color: liked ? '#e63946' : '#fff',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.6))',
            transition: 'transform .15s, color .15s',
            display: 'block',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {liked ? '♥' : '♡'}
          </button>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
            {formatCount(likes)}
          </span>
        </div>

        {/* Comment */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={e => { e.stopPropagation(); setShowComments(true); }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 26, color: '#fff',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.6))',
            transition: 'transform .15s', display: 'block',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >💬</button>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
            {formatCount(comments)}
          </span>
        </div>

        {/* Save */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleSave} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 24, color: saved ? '#f4a261' : '#fff',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.6))',
            transition: 'transform .15s, color .15s', display: 'block',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >{saved ? '🔖' : '⊹'}</button>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>Save</span>
        </div>

        {/* Mute */}
        {isVideo && (
          <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, color: '#fff',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.6))',
            transition: 'transform .15s', display: 'block',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >{muted ? '🔇' : '🔊'}</button>
        )}
      </div>

      {showComments && <CommentDrawer post={post} onClose={() => setShowComments(false)} />}
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────
const ReelsPage = () => {
  const [reels,     setReels]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      postsAPI.getFeed({ limit: 20 }).catch(() => ({ data: { posts: [] } })),
      postsAPI.getExplore({ limit: 20 }).catch(() => ({ data: [] })),
    ]).then(([feedRes, exploreRes]) => {
      const feedPosts    = feedRes.data?.posts || [];
      const explorePosts = Array.isArray(exploreRes.data) ? exploreRes.data : [];
      const seen = new Set();
      const all  = [...feedPosts, ...explorePosts].filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id); return true;
      });
      setReels(all);
    }).finally(() => setLoading(false));
  }, []);

  // Track active reel
  useEffect(() => {
    if (!reels.length || !containerRef.current) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setActiveIdx(parseInt(e.target.dataset.idx || '0'));
      }),
      { threshold: 0.6 }
    );
    Array.from(containerRef.current.children).forEach(c => observer.observe(c));
    return () => observer.disconnect();
  }, [reels]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (!containerRef.current) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        containerRef.current.children[Math.min(activeIdx+1, reels.length-1)]?.scrollIntoView({ behavior: 'smooth' });
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        containerRef.current.children[Math.max(activeIdx-1, 0)]?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIdx, reels]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <Spinner size={32} />
    </div>
  );

  return (
    // Outer page — has sidebar via Layout
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      {/* Phone-shaped container — like Instagram desktop */}
      <div style={{
        width: 400,
        height: '92vh',
        maxHeight: 800,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,.3)',
        background: '#000',
        flexShrink: 0,
      }}>
        {reels.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 48 }}>🎬</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>No posts yet</div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, textAlign: 'center', padding: '0 24px' }}>
              Follow people or create posts to see them here
            </div>
            <Link to="/" style={{ marginTop: 8, padding: '10px 24px', background: '#fff', color: '#000', borderRadius: 24, fontWeight: 600, fontSize: 14 }}>
              Go home
            </Link>
          </div>
        ) : (
          <>
            {/* Scroll snapping container */}
            <div
              ref={containerRef}
              style={{
                height: '100%',
                overflowY: 'scroll',
                scrollSnapType: 'y mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {reels.map((post, i) => (
                <div
                  key={post.id}
                  data-idx={i}
                  style={{
                    height: '100%',
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always',
                  }}
                >
                  <ReelItem post={post} isActive={i === activeIdx} />
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            {reels.length > 1 && (
              <div style={{
                position: 'absolute', right: -20, top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', flexDirection: 'column', gap: 5,
                pointerEvents: 'none',
              }}>
                {reels.map((_, i) => (
                  <div key={i} style={{
                    width: 3,
                    height: i === activeIdx ? 18 : 6,
                    borderRadius: 2,
                    background: i === activeIdx ? 'var(--text-1)' : 'var(--border-2)',
                    transition: 'all .3s ease',
                  }} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Up/Down arrows outside the phone */}
      {reels.length > 1 && (
        <div style={{
          position: 'absolute', right: 'calc(50% - 240px)',
          top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <button
            onClick={() => containerRef.current?.children[Math.max(activeIdx-1,0)]?.scrollIntoView({ behavior:'smooth' })}
            disabled={activeIdx === 0}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              cursor: activeIdx === 0 ? 'not-allowed' : 'pointer',
              fontSize: 18, opacity: activeIdx === 0 ? .3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s', boxShadow: 'var(--shadow)',
            }}
          >↑</button>
          <button
            onClick={() => containerRef.current?.children[Math.min(activeIdx+1, reels.length-1)]?.scrollIntoView({ behavior:'smooth' })}
            disabled={activeIdx === reels.length - 1}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              cursor: activeIdx === reels.length-1 ? 'not-allowed' : 'pointer',
              fontSize: 18, opacity: activeIdx === reels.length-1 ? .3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s', boxShadow: 'var(--shadow)',
            }}
          >↓</button>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;