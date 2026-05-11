import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { getMediaUrl } from '../../utils/helpers';
import api from '../../api/client';
import toast from 'react-hot-toast';

const EditPostModal = ({ post, open, onClose, onSaved }) => {
  const [caption,  setCaption]  = useState(post?.caption  || '');
  const [location, setLocation] = useState(post?.location || '');
  const [loading,  setLoading]  = useState(false);

  const media = post?.media?.[0];
  const thumb = getMediaUrl(media?.thumbnail_url || media?.media_url);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put(`/posts/${post.id}`, { caption, location });
      toast.success('Post updated!');
      onSaved?.({ ...post, caption: data.caption, location: data.location });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth={500}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Edit post</span>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>✕</button>
      </div>

      <div style={{ padding: 20 }}>
        {/* Post preview */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, padding: 14, background: 'var(--surface-2)', borderRadius: 12 }}>
          {thumb && (
            <img src={thumb} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
              onError={e => { e.target.src = `https://picsum.photos/seed/${post?.id}/100/100`; }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>@{post?.username}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {post?.media?.length > 1 ? `${post.media.length} photos/videos` : media?.media_type === 'video' ? 'Video' : 'Photo'}
            </div>
          </div>
        </div>

        {/* Caption */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Caption
          </label>
          <textarea
            className="input"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={4}
            maxLength={2200}
            placeholder="Write a caption…"
            style={{ resize: 'none', fontSize: 14, lineHeight: 1.6 }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            {caption.length}/2200
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Location
          </label>
          <input
            className="input"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Add location…"
            maxLength={100}
            style={{ fontSize: 14 }}
          />
        </div>

        {/* Hashtag hint */}
        <div style={{ padding: '10px 12px', background: 'rgba(69,123,157,.08)', borderRadius: 10, marginBottom: 20, fontSize: 13, color: 'var(--blue)', lineHeight: 1.5 }}>
          💡 You can add or remove <strong>#hashtags</strong> from the caption — they'll be updated automatically.
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
            {loading ? <><Spinner size={15} color="#fff" /> Saving…</> : 'Save changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditPostModal;
