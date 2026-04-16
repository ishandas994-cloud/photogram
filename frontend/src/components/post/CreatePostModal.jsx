import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Modal from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { postsAPI } from '../../api';
import toast from 'react-hot-toast';

const CreatePostModal = ({ open, onClose }) => {
  const [files,    setFiles]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [caption,  setCaption]  = useState('');
  const [location, setLocation] = useState('');
  const [loading,  setLoading]  = useState(false);

  const onDrop = useCallback((accepted) => {
    setFiles(accepted);
    setPreviews(accepted.map(f => URL.createObjectURL(f)));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [], 'video/*': [] }, maxFiles: 10,
  });

  const reset = () => {
    setFiles([]); setPreviews([]); setCaption(''); setLocation('');
    previews.forEach(url => URL.revokeObjectURL(url));
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!files.length) return;
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('media', f));
      if (caption)  fd.append('caption', caption);
      if (location) fd.append('location', location);
      fd.append('type', files.length > 1 ? 'carousel' : 'image');
      await postsAPI.createPost(fd);
      toast.success('Post shared!');
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth={560}>
      <div style={{ padding: '20px 24px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Create new post</span>
        <button onClick={handleClose} style={{ fontSize: 20, color: 'var(--text-3)', padding: 4 }}>✕</button>
      </div>

      <div style={{ padding: 24 }}>
        {/* Upload area */}
        {!previews.length ? (
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? 'var(--blue)' : 'var(--border-2)'}`,
              borderRadius: 'var(--radius)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragActive ? '#f0f6ff' : 'var(--bg)',
              transition: 'all .2s',
            }}
          >
            <input {...getInputProps()} />
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
              {isDragActive ? 'Drop here!' : 'Drag photos & videos here'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              or click to browse — up to 10 files
            </div>
            <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
              Select files
            </button>
          </div>
        ) : (
          <div>
            {/* Preview grid */}
            <div style={{ display: 'grid', gridTemplateColumns: previews.length > 1 ? 'repeat(3,1fr)' : '1fr', gap: 6, marginBottom: 16, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', background: '#000' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => {
                      setFiles(p => p.filter((_, j) => j !== i));
                      setPreviews(p => { URL.revokeObjectURL(p[i]); return p.filter((_, j) => j !== i); });
                    }}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 12, cursor: 'pointer' }}
                  >✕</button>
                </div>
              ))}
            </div>

            <textarea
              className="input"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write a caption…"
              rows={3}
              maxLength={2200}
              style={{ resize: 'none', marginBottom: 10, fontSize: 14 }}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-3)', marginTop: -6, marginBottom: 10 }}>
              {caption.length}/2200
            </div>
            <input
              className="input"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Add location…"
              style={{ marginBottom: 16, fontSize: 14 }}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline" onClick={handleClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!files.length || loading}
          >
            {loading ? <><Spinner size={14} color="#fff" /> Sharing…</> : 'Share post'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreatePostModal;