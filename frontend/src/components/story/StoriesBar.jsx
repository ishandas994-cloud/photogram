import React, { useState, useEffect, useRef } from 'react';
import { storiesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import StoryViewer from './StoryViewer';
import { Spinner } from '../ui/Spinner';
import toast from 'react-hot-toast';

// ── Upload Story Modal ───────────────────────────────────────
const UploadStoryModal = ({ onClose, onUploaded }) => {
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [caption,  setCaption]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [isDrag,   setIsDrag]   = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'];
    if (!allowed.includes(f.type)) { toast.error('Only images and videos allowed'); return; }
    if (f.size > 50 * 1024 * 1024)  { toast.error('Max file size is 50MB'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setIsDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) { toast.error('Please select a file'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('media', file);
      if (caption.trim()) fd.append('caption', caption.trim());
      await storiesAPI.createStory(fd);
      toast.success('Story uploaded! It will disappear in 24 hours 👻');
      onUploaded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const isVideo = file?.type?.startsWith('video/');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 20,
          width: '100%', maxWidth: 420,
          overflow: 'hidden',
          animation: 'fadeIn .25s ease',
          boxShadow: '0 24px 80px rgba(0,0,0,.4)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Add to your story</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>Disappears after 24 hours</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Preview */}
          {preview ? (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '9/16', maxHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isVideo ? (
                  <video src={preview} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
              </div>
              {/* Change file button */}
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,.6)', color: '#fff',
                  border: 'none', borderRadius: 20, padding: '5px 12px',
                  fontSize: 12, cursor: 'pointer', fontWeight: 500,
                }}
              >Change</button>
            </div>
          ) : (
            /* Drop zone */
            <div
              onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
              onDragLeave={() => setIsDrag(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${isDrag ? 'var(--accent)' : 'var(--border-2)'}`,
                borderRadius: 14, padding: '40px 20px',
                textAlign: 'center', cursor: 'pointer',
                background: isDrag ? 'rgba(230,57,70,.04)' : 'var(--surface-2)',
                transition: 'all .2s', marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 12 }}>📸</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
                {isDrag ? 'Drop it here!' : 'Upload photo or video'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
                Drag & drop or click to browse
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['JPG', 'PNG', 'WEBP', 'GIF', 'MP4'].map(t => (
                  <span key={t} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--border)', color: 'var(--text-3)', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                onChange={e => handleFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* Caption */}
          {file && (
            <div style={{ marginBottom: 16 }}>
              <input
                className="input"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Add a caption… (optional)"
                maxLength={150}
                style={{ fontSize: 14 }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                {caption.length}/150
              </div>
            </div>
          )}

          {/* Duration info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(230,57,70,.06)', borderRadius: 10, marginBottom: 16, border: '1px solid rgba(230,57,70,.15)' }}>
            <span style={{ fontSize: 16 }}>⏰</span>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              This story will automatically disappear <strong>24 hours</strong> after posting
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!file || loading}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              {loading ? (
                <><Spinner size={16} color="#fff" /> Uploading…</>
              ) : (
                'Share story 🚀'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Your Story bubble (add button) ───────────────────────────
const AddStoryBubble = ({ myStory, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
    >
      <div style={{ position: 'relative' }}>
        {/* Ring if has story */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          padding: myStory ? 2 : 0,
          background: myStory
            ? 'linear-gradient(135deg,#f9a825,#e63946,#c62a47)'
            : 'var(--border)',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            border: myStory ? '2px solid var(--surface)' : 'none',
          }}>
            {myStory ? (
              <img
                src={myStory.thumbnail_url
                  ? ('http://localhost:5000' + myStory.thumbnail_url)
                  : ('http://localhost:5000' + myStory.media_url)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={{ fontSize: 28, color: 'var(--text-3)' }}>👤</div>
            )}
          </div>
        </div>

        {/* Plus badge */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--accent)', color: '#fff',
          fontSize: 16, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--surface)',
          lineHeight: 1,
        }}>+</div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500, maxWidth: 64, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Your story
      </span>
    </div>
  );
};

// ── Other user story bubble ──────────────────────────────────
const StoryBubble = ({ storyGroup, onClick }) => (
  <div
    onClick={onClick}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
  >
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      padding: 2,
      background: storyGroup.all_viewed
        ? 'var(--border-2)'
        : 'linear-gradient(135deg,#f9a825,#e63946,#c62a47)',
      flexShrink: 0,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        border: '2px solid var(--surface)',
        overflow: 'hidden', background: 'var(--border)',
      }}>
        <img
          src={storyGroup.avatar_url
            ? (storyGroup.avatar_url.startsWith('http') ? storyGroup.avatar_url : 'http://localhost:5000' + storyGroup.avatar_url)
            : `https://api.dicebear.com/7.x/notionists/svg?seed=${storyGroup.username}`}
          alt={storyGroup.username}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.src = `https://api.dicebear.com/7.x/notionists/svg?seed=${storyGroup.username}`; }}
        />
      </div>
    </div>
    <span style={{
      fontSize: 11, color: storyGroup.all_viewed ? 'var(--text-3)' : 'var(--text-1)',
      fontWeight: storyGroup.all_viewed ? 400 : 600,
      maxWidth: 64, textAlign: 'center', overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {storyGroup.username}
    </span>
  </div>
);

// ── Main StoriesBar ──────────────────────────────────────────
const StoriesBar = () => {
  const { user }                    = useAuth();
  const [stories,    setStories]    = useState([]);
  const [viewing,    setViewing]    = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [myStory,    setMyStory]    = useState(null);

  const loadStories = () => {
    storiesAPI.getFeed()
      .then(({ data }) => {
        setStories(data);
        // Check if current user has a story
        const mine = data.find(s => s.user_id === user?.id);
        setMyStory(mine?.stories?.[0] || null);
      })
      .catch(() => {});
  };

  useEffect(() => { loadStories(); }, [user]);

  return (
    <>
      {/* Stories tray */}
      <div style={{
        display: 'flex', gap: 16, overflowX: 'auto',
        padding: '16px 4px 12px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
        alignItems: 'flex-start',
      }}>
        {/* Add story button — always first */}
        <AddStoryBubble
          myStory={myStory}
          onClick={() => setShowUpload(true)}
        />

        {/* Other users' stories */}
        {stories
          .filter(s => s.user_id !== user?.id)
          .map((s, i) => (
            <StoryBubble
              key={s.user_id}
              storyGroup={s}
              onClick={() => setViewing(stories.findIndex(x => x.user_id === s.user_id))}
            />
          ))}
      </div>

      {/* Story viewer */}
      {viewing !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={viewing}
          onClose={() => { setViewing(null); loadStories(); }}
        />
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadStoryModal
          onClose={() => setShowUpload(false)}
          onUploaded={loadStories}
        />
      )}
    </>
  );
};

export default StoriesBar;
