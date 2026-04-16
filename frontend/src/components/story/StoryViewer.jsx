import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import { storiesAPI } from '../../api';
import { getMediaUrl, timeAgo } from '../../utils/helpers';

const STORY_DURATION = 5000;

const StoryViewer = ({ stories, initialIndex, onClose }) => {
  const [userIdx, setUserIdx]   = useState(initialIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused]     = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const elapsed  = useRef(0);

  const user    = stories[userIdx];
  const story   = user?.stories?.[storyIdx];
  const duration = (story?.duration_sec || 5) * 1000;

  const goNext = useCallback(() => {
    if (storyIdx < user.stories.length - 1) {
      setStoryIdx(i => i + 1);
      setProgress(0);
      elapsed.current = 0;
    } else if (userIdx < stories.length - 1) {
      setUserIdx(i => i + 1);
      setStoryIdx(0);
      setProgress(0);
      elapsed.current = 0;
    } else {
      onClose();
    }
  }, [storyIdx, userIdx, user, stories, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) { setStoryIdx(i => i - 1); setProgress(0); elapsed.current = 0; }
    else if (userIdx > 0) { setUserIdx(i => i - 1); setStoryIdx(0); setProgress(0); elapsed.current = 0; }
  }, [storyIdx, userIdx]);

  // Progress timer
  useEffect(() => {
    if (!story || paused) return;
    startRef.current = Date.now() - elapsed.current;
    timerRef.current = setInterval(() => {
      const passed = Date.now() - startRef.current;
      const pct    = Math.min(passed / duration * 100, 100);
      setProgress(pct);
      elapsed.current = passed;
      if (passed >= duration) {
        clearInterval(timerRef.current);
        goNext();
      }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [story, paused, storyIdx, userIdx, goNext, duration]);

  // Mark viewed
  useEffect(() => {
    if (story?.id) storiesAPI.viewStory(story.id).catch(() => {});
  }, [story?.id]);

  if (!user || !story) return null;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Story container */}
      <div style={{ position: 'relative', height: '100vh', maxWidth: 420, width: '100%', background: '#111' }}>
        {/* Progress bars */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4, zIndex: 10 }}>
          {user.stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: '#fff',
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                transition: i === storyIdx ? 'none' : undefined,
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ position: 'absolute', top: 28, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10, zIndex: 10 }}>
          <Link to={`/profile/${user.username}`} onClick={onClose}>
            <Avatar user={user} size="sm" />
          </Link>
          <div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{user.username}</div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>{timeAgo(story.created_at)}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <button onClick={() => setPaused(p => !p)} style={{ color: '#fff', fontSize: 16 }}>{paused ? '▶' : '⏸'}</button>
            <button onClick={onClose} style={{ color: '#fff', fontSize: 18 }}>✕</button>
          </div>
        </div>

        {/* Media */}
        <img
          src={getMediaUrl(story.media_url)}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Caption */}
        {story.caption && (
          <div style={{ position: 'absolute', bottom: 40, left: 16, right: 16, color: '#fff', fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,.8)', zIndex: 10 }}>
            {story.caption}
          </div>
        )}

        {/* Tap zones */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 5 }}>
          <div style={{ flex: 1 }} onClick={goPrev} />
          <div style={{ flex: 1 }} onClick={goNext} />
        </div>
      </div>

      {/* Nav arrows */}
      {userIdx > 0 && (
        <button onClick={() => { setUserIdx(i=>i-1); setStoryIdx(0); setProgress(0); }}
          style={{ position: 'absolute', left: 16, color: '#fff', fontSize: 32, zIndex: 10 }}>‹</button>
      )}
      {userIdx < stories.length - 1 && (
        <button onClick={() => { setUserIdx(i=>i+1); setStoryIdx(0); setProgress(0); }}
          style={{ position: 'absolute', right: 16, color: '#fff', fontSize: 32, zIndex: 10 }}>›</button>
      )}
    </div>,
    document.body
  );
};

export default StoryViewer;