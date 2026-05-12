import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { storiesAPI } from '../../api';
import { timeAgo } from '../../utils/helpers';
import { Spinner } from '../ui/Spinner';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

const API_BASE =
  (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
    .replace('/api', '');

const getUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return API_BASE + url;
};

// ── Viewers drawer (shown to story owner) ───────────────────
const ViewersDrawer = ({ storyId, onClose }) => {
  const [viewers,  setViewers]  = useState([]);
  const [reactions, setReactions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    storiesAPI.getViewers(storyId)
      .then(({ data }) => setViewers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 20 }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '60%', zIndex: 21,
        background: '#1a1a1a',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp .3s ease',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.3)' }} />
        </div>
        <div style={{ padding: '0 16px 10px', borderBottom: '1px solid rgba(255,255,255,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
            👁 {viewers.length} {viewers.length === 1 ? 'viewer' : 'viewers'}
          </span>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,.6)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner color="#fff" /></div>
          ) : viewers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,.4)', fontSize: 14 }}>No views yet</div>
          ) : (
            viewers.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <Avatar user={v} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{v.username}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{timeAgo(v.viewed_at)}</div>
                </div>
                {v.reaction && <span style={{ fontSize: 22 }}>{v.reaction}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

// ── Reaction picker ─────────────────────────────────────────
const EMOJIS = ['❤️','😂','😮','😢','😡','👏','🔥','💯','😍','🙌'];

// ── Main StoryViewer ─────────────────────────────────────────
const StoryViewer = ({ stories, initialIndex, currentUserId, onClose, onAddStory }) => {
  const [userIdx,     setUserIdx]     = useState(initialIndex);
  const [storyIdx,    setStoryIdx]    = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [paused,      setPaused]      = useState(false);
  const [showReact,   setShowReact]   = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [floatEmoji,  setFloatEmoji]  = useState(null);
  const [replyText,   setReplyText]   = useState('');

  const timerRef = useRef(null);
  const elapsed  = useRef(0);
  const videoRef = useRef(null);

  const user    = stories[userIdx];
  const story   = user?.stories?.[storyIdx];
  const isOwn   = user?.user_id === currentUserId;
  const isVideo = story?.media_type === 'video';
  const duration = (story?.duration_sec || 5) * 1000;

  // Mark viewed
  useEffect(() => {
    if (story?.id && !isOwn) {
      storiesAPI.viewStory(story.id).catch(() => {});
    }
  }, [story?.id, isOwn]);

  const resetProgress = () => { elapsed.current = 0; setProgress(0); };

  const goNext = useCallback(() => {
    resetProgress();
    if (storyIdx < (user?.stories?.length || 0) - 1) {
      setStoryIdx(i => i + 1);
    } else if (userIdx < stories.length - 1) {
      setUserIdx(i => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [storyIdx, userIdx, user, stories, onClose]);

  const goPrev = useCallback(() => {
    resetProgress();
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
    } else if (userIdx > 0) {
      setUserIdx(i => i - 1);
      setStoryIdx(0);
    }
  }, [storyIdx, userIdx]);

  // Timer for images
  useEffect(() => {
    if (!story || paused || isVideo || showReact || showViewers) return;
    startRef.current = Date.now() - elapsed.current;
    timerRef.current = setInterval(() => {
      const passed = Date.now() - startRef.current;
      const pct    = Math.min((passed / duration) * 100, 100);
      setProgress(pct);
      elapsed.current = passed;
      if (passed >= duration) { clearInterval(timerRef.current); goNext(); }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [story, paused, isVideo, showReact, showViewers, goNext, duration, storyIdx, userIdx]);

  const startRef = useRef(null);

  // Video progress
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnd  = () => goNext();
    const onTime = () => { if (v.duration) setProgress((v.currentTime / v.duration) * 100); };
    v.addEventListener('ended',      onEnd);
    v.addEventListener('timeupdate', onTime);
    return () => { v.removeEventListener('ended', onEnd); v.removeEventListener('timeupdate', onTime); };
  }, [story, goNext]);

  const sendReaction = async (emoji) => {
    try {
      await storiesAPI.reactToStory(story.id, emoji);
      setFloatEmoji(emoji);
      setTimeout(() => setFloatEmoji(null), 1200);
      setShowReact(false);
      toast.success('Reaction sent!');
    } catch { toast.error('Failed to send reaction'); }
  };

  if (!user || !story) return null;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Phone-shaped container */}
      <div style={{
        position: 'relative',
        width: 380, height: '90vh', maxHeight: 700,
        borderRadius: 24, overflow: 'hidden',
        background: '#111',
        boxShadow: '0 24px 80px rgba(0,0,0,.6)',
      }}>

        {/* Progress bars */}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: 4, zIndex: 10 }}>
          {user.stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: '#fff', borderRadius: 2,
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ position: 'absolute', top: 22, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10, zIndex: 10 }}>
          <Link to={`/profile/${user.username}`} onClick={onClose}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,.6)', overflow: 'hidden', background: 'rgba(255,255,255,.1)' }}>
              <img
                src={user.avatar_url ? getUrl(user.avatar_url) : `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}`}
                alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.src = `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}`; }}
              />
            </div>
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
              {user.username} {isOwn && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 400 }}>(You)</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>{timeAgo(story.created_at)}</div>
          </div>
          <button onClick={() => setPaused(p => !p)} style={{ color: '#fff', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer' }}>
            {paused ? '▶' : '⏸'}
          </button>
          <button onClick={onClose} style={{ color: '#fff', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Media */}
        {isVideo ? (
          <video ref={videoRef} key={story.id} src={getUrl(story.media_url)} autoPlay playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <img key={story.id} src={getUrl(story.media_url)} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.src = `https://picsum.photos/seed/${story.id}/400/700`; }} />
        )}

        {/* Caption */}
        {story.caption && (
          <div style={{ position: 'absolute', bottom: isOwn ? 70 : 90, left: 16, right: 16, zIndex: 10, color: '#fff', fontSize: 14, lineHeight: 1.5, textShadow: '0 1px 6px rgba(0,0,0,.8)', textAlign: 'center', fontWeight: 500 }}>
            {story.caption}
          </div>
        )}

        {/* Floating emoji */}
        {floatEmoji && (
          <div style={{ position: 'absolute', bottom: 120, left: '50%', transform: 'translateX(-50%)', fontSize: 56, zIndex: 20, animation: 'likeFloat .9s ease forwards', pointerEvents: 'none' }}>
            {floatEmoji}
          </div>
        )}

        {/* ── OWNER view: show viewers count ── */}
        {isOwn ? (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '12px 16px 24px', background: 'linear-gradient(transparent, rgba(0,0,0,.7))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => { setShowViewers(true); setPaused(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}
            >
              <span style={{ fontSize: 20 }}>👁</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>View viewers</span>
            </button>
            <button
              onClick={() => { onClose(); onAddStory?.(); }}
              style={{ padding: '8px 16px', background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            >
              + Add more
            </button>
          </div>
        ) : (
          /* ── VIEWER: react / reply ── */
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '8px 12px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,.75))', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              placeholder={`Reply to ${user.username}…`}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => { if (!replyText) setPaused(false); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && replyText.trim()) {
                  sendReaction(replyText.trim());
                  setReplyText('');
                  setPaused(false);
                }
              }}
              style={{
                flex: 1, background: 'rgba(255,255,255,.12)',
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: 24, padding: '9px 16px',
                color: '#fff', fontSize: 13, outline: 'none',
                fontFamily: 'var(--font)',
              }}
            />
            <button
              onClick={() => { setShowReact(s => !s); setPaused(true); }}
              style={{ fontSize: 26, background: 'none', border: 'none', cursor: 'pointer' }}
            >😊</button>
          </div>
        )}

        {/* Emoji picker */}
        {showReact && !isOwn && (
          <div style={{ position: 'absolute', bottom: 72, left: 8, right: 8, zIndex: 20, background: 'rgba(20,20,20,.96)', borderRadius: 20, padding: '14px 8px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 4, backdropFilter: 'blur(12px)', animation: 'slideUp .2s ease' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => sendReaction(e)}
                style={{ fontSize: 30, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 10, padding: '6px 8px', transition: 'transform .15s' }}
                onMouseEnter={el => el.currentTarget.style.transform = 'scale(1.3)'}
                onMouseLeave={el => el.currentTarget.style.transform = 'scale(1)'}
              >{e}</button>
            ))}
          </div>
        )}

        {/* Viewers drawer */}
        {showViewers && isOwn && (
          <ViewersDrawer storyId={story.id} onClose={() => { setShowViewers(false); setPaused(false); }} />
        )}

        {/* Tap zones */}
        <div style={{ position: 'absolute', inset: '60px 0 80px 0', display: 'flex', zIndex: 5 }}>
          <div style={{ flex: 1 }} onClick={goPrev} />
          <div style={{ flex: 1 }} onClick={goNext} />
        </div>
      </div>

      {/* Prev user */}
      {userIdx > 0 && (
        <button onClick={() => { setUserIdx(i=>i-1); setStoryIdx(0); resetProgress(); }}
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#fff', fontSize: 32, background: 'rgba(0,0,0,.4)', border: 'none', borderRadius: '50%', width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ‹
        </button>
      )}
      {/* Next user */}
      {userIdx < stories.length - 1 && (
        <button onClick={() => { setUserIdx(i=>i+1); setStoryIdx(0); resetProgress(); }}
          style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#fff', fontSize: 32, background: 'rgba(0,0,0,.4)', border: 'none', borderRadius: '50%', width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ›
        </button>
      )}
    </div>,
    document.body
  );
};

export default StoryViewer;
