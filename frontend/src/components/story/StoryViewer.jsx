import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { storiesAPI } from '../../api';
import { timeAgo } from '../../utils/helpers';

const getUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return 'http://localhost:5000' + url;
};

const StoryViewer = ({ stories, initialIndex, onClose }) => {
  const [userIdx,  setUserIdx]  = useState(initialIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused,   setPaused]   = useState(false);
  const [reaction, setReaction] = useState('');
  const [showReact, setShowReact] = useState(false);

  const timerRef  = useRef(null);
  const startRef  = useRef(null);
  const elapsed   = useRef(0);
  const videoRef  = useRef(null);

  const user  = stories[userIdx];
  const story = user?.stories?.[storyIdx];
  const duration = (story?.duration_sec || 5) * 1000;
  const isVideo  = story?.media_type === 'video';

  // Mark as viewed
  useEffect(() => {
    if (story?.id) storiesAPI.viewStory(story.id).catch(() => {});
  }, [story?.id]);

  const goNext = useCallback(() => {
    elapsed.current = 0;
    setProgress(0);
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
    elapsed.current = 0;
    setProgress(0);
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
    } else if (userIdx > 0) {
      setUserIdx(i => i - 1);
      setStoryIdx(0);
    }
  }, [storyIdx, userIdx]);

  // Progress timer
  useEffect(() => {
    if (!story || paused || isVideo) return;
    startRef.current = Date.now() - elapsed.current;
    timerRef.current = setInterval(() => {
      const passed = Date.now() - startRef.current;
      const pct    = Math.min((passed / duration) * 100, 100);
      setProgress(pct);
      elapsed.current = passed;
      if (passed >= duration) {
        clearInterval(timerRef.current);
        goNext();
      }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [story, paused, isVideo, goNext, duration, storyIdx, userIdx]);

  // Video ended → go next
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => goNext();
    const onTimeUpdate = () => {
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    v.addEventListener('ended', onEnded);
    v.addEventListener('timeupdate', onTimeUpdate);
    return () => { v.removeEventListener('ended', onEnded); v.removeEventListener('timeupdate', onTimeUpdate); };
  }, [story, goNext]);

  const sendReaction = async (emoji) => {
    try {
      await storiesAPI.reactToStory(story.id, emoji);
      setReaction(emoji);
      setShowReact(false);
      setTimeout(() => setReaction(''), 2000);
    } catch {}
  };

  if (!user || !story) return null;

  const mediaSrc = getUrl(story.media_url);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Story container — phone shaped */}
      <div style={{
        position: 'relative',
        width: 380, height: '90vh', maxHeight: 680,
        borderRadius: 20, overflow: 'hidden',
        background: '#111',
        boxShadow: '0 24px 80px rgba(0,0,0,.6)',
      }}>

        {/* Progress bars */}
        <div style={{
          position: 'absolute', top: 10, left: 10, right: 10,
          display: 'flex', gap: 4, zIndex: 10,
        }}>
          {user.stories.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3,
              background: 'rgba(255,255,255,.3)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 2, background: '#fff',
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                transition: i === storyIdx ? 'none' : undefined,
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{
          position: 'absolute', top: 22, left: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 10, zIndex: 10,
        }}>
          <Link to={`/profile/${user.username}`} onClick={onClose}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,.6)',
              overflow: 'hidden', background: 'rgba(255,255,255,.2)',
            }}>
              <img
                src={user.avatar_url ? getUrl(user.avatar_url) : `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}`}
                alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.src = `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}`; }}
              />
            </div>
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{user.username}</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>{timeAgo(story.created_at)}</div>
          </div>
          <button
            onClick={() => setPaused(p => !p)}
            style={{ color: '#fff', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}
          >{paused ? '▶' : '⏸'}</button>
          <button
            onClick={onClose}
            style={{ color: '#fff', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* Media */}
        {isVideo ? (
          <video
            ref={videoRef}
            key={story.id}
            src={mediaSrc}
            autoPlay
            playsInline
            muted={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <img
            key={story.id}
            src={mediaSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.src = `https://picsum.photos/seed/${story.id}/400/700`; }}
          />
        )}

        {/* Caption */}
        {story.caption && (
          <div style={{
            position: 'absolute', bottom: 80, left: 12, right: 12, zIndex: 10,
            color: '#fff', fontSize: 14, lineHeight: 1.5,
            textShadow: '0 1px 6px rgba(0,0,0,.8)',
            textAlign: 'center', fontWeight: 500,
          }}>
            {story.caption}
          </div>
        )}

        {/* Reaction floating */}
        {reaction && (
          <div style={{
            position: 'absolute', bottom: 100, left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 52, zIndex: 20,
            animation: 'likeFloat .8s ease forwards',
          }}>{reaction}</div>
        )}

        {/* Bottom bar — react */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          padding: '12px 12px 20px',
          background: 'linear-gradient(transparent, rgba(0,0,0,.7))',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <input
            placeholder="Send reaction…"
            onFocus={() => setShowReact(true)}
            readOnly
            style={{
              flex: 1, background: 'rgba(255,255,255,.15)',
              border: '1px solid rgba(255,255,255,.3)',
              borderRadius: 24, padding: '9px 16px',
              color: '#fff', fontSize: 13,
              fontFamily: 'var(--font)', cursor: 'pointer',
              outline: 'none',
            }}
          />
          <button
            onClick={() => setShowReact(s => !s)}
            style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' }}
          >😊</button>
        </div>

        {/* Emoji picker */}
        {showReact && (
          <div style={{
            position: 'absolute', bottom: 70, left: 12, right: 12, zIndex: 20,
            background: 'rgba(30,30,30,.95)',
            borderRadius: 16, padding: '12px 8px',
            display: 'flex', justifyContent: 'space-around',
            animation: 'slideUp .2s ease',
            backdropFilter: 'blur(10px)',
          }}>
            {['❤️','😂','😮','😢','😡','👏','🔥','💯'].map(e => (
              <button key={e} onClick={() => sendReaction(e)}
                style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform .15s', borderRadius: 8, padding: 4 }}
                onMouseEnter={el => el.currentTarget.style.transform = 'scale(1.3)'}
                onMouseLeave={el => el.currentTarget.style.transform = 'scale(1)'}
              >{e}</button>
            ))}
          </div>
        )}

        {/* Tap zones for prev/next */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 5 }}>
          <div style={{ flex: 1 }} onClick={goPrev} />
          <div style={{ flex: 1 }} onClick={goNext} />
        </div>
      </div>

      {/* Prev user arrow */}
      {userIdx > 0 && (
        <button onClick={() => { setUserIdx(i => i - 1); setStoryIdx(0); elapsed.current = 0; setProgress(0); }}
          style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#fff', fontSize: 36, background: 'rgba(0,0,0,.4)', border: 'none', borderRadius: '50%', width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ‹
        </button>
      )}

      {/* Next user arrow */}
      {userIdx < stories.length - 1 && (
        <button onClick={() => { setUserIdx(i => i + 1); setStoryIdx(0); elapsed.current = 0; setProgress(0); }}
          style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: '#fff', fontSize: 36, background: 'rgba(0,0,0,.4)', border: 'none', borderRadius: '50%', width: 48, height: 48, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ›
        </button>
      )}
    </div>,
    document.body
  );
};

export default StoryViewer;
