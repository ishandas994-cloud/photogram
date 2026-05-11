import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getMediaUrl, formatCount } from '../utils/helpers';
import { Spinner } from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import PostCard from '../components/post/PostCard';
import toast from 'react-hot-toast';

// ── Add to Collection modal ──────────────────────────────────
export const AddToCollectionModal = ({ post, open, onClose }) => {
  const [collections, setCollections] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [adding,      setAdding]      = useState(null);
  const [added,       setAdded]       = useState(new Set());

  useEffect(() => {
    if (!open) return;
    api.get('/posts/collections')
      .then(({ data }) => setCollections(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data: coll } = await api.post('/posts/collections', { name: newName.trim() });
      await api.post(`/posts/collections/${coll.id}/posts`, { post_id: post.id });
      setCollections(prev => [{ ...coll, post_count: 1 }, ...prev]);
      setAdded(prev => new Set([...prev, coll.id]));
      setNewName('');
      toast.success(`Saved to "${coll.name}"`);
    } catch { toast.error('Failed'); }
    finally { setCreating(false); }
  };

  const addToExisting = async (collId, collName) => {
    if (added.has(collId)) return;
    setAdding(collId);
    try {
      await api.post(`/posts/collections/${collId}/posts`, { post_id: post.id });
      setAdded(prev => new Set([...prev, collId]));
      toast.success(`Saved to "${collName}"`);
    } catch { toast.error('Failed'); }
    finally { setAdding(null); }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth={440}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Save to collection</span>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      <div style={{ padding: 20 }}>
        {/* New collection input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            New collection
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Travel, Recipes, Inspiration…"
              onKeyDown={e => e.key === 'Enter' && createAndAdd()}
              style={{ flex: 1, fontSize: 14 }}
            />
            <button onClick={createAndAdd} disabled={!newName.trim() || creating}
              className="btn btn-primary" style={{ flexShrink: 0 }}>
              {creating ? <Spinner size={14} color="#fff" /> : 'Create'}
            </button>
          </div>
        </div>

        {/* Existing collections */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Your collections
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
          ) : collections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 14 }}>
              No collections yet — create one above
            </div>
          ) : (
            collections.map(c => (
              <div key={c.id}
                onClick={() => !added.has(c.id) && addToExisting(c.id, c.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12, cursor: added.has(c.id) ? 'default' : 'pointer',
                  background: added.has(c.id) ? 'rgba(45,106,79,.08)' : 'transparent',
                  transition: 'background .15s', marginBottom: 4,
                }}
                onMouseEnter={e => { if (!added.has(c.id)) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (!added.has(c.id)) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Cover */}
                <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {c.cover_url ? (
                    <img src={getMediaUrl(c.cover_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display='none'; }} />
                  ) : (
                    <span style={{ fontSize: 22 }}>🗂️</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatCount(c.post_count)} posts</div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${added.has(c.id) ? 'var(--green)' : 'var(--border-2)'}`, background: added.has(c.id) ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                  {adding === c.id ? <Spinner size={12} /> : added.has(c.id) ? <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span> : null}
                </div>
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} className="btn btn-outline" style={{ width: '100%', marginTop: 12 }}>Done</button>
      </div>
    </Modal>
  );
};

// ── Collection detail view ───────────────────────────────────
const CollectionDetail = ({ collection, onBack, onDelete }) => {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get(`/posts/collections/${collection.id}/posts`)
      .then(({ data }) => setPosts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collection.id]);

  const removePost = async (postId) => {
    try {
      await api.delete(`/posts/collections/${collection.id}/posts/${postId}`);
      setPosts(p => p.filter(x => x.id !== postId));
      toast.success('Removed from collection');
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{collection.name}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{formatCount(posts.length)} posts</div>
        </div>
        <button onClick={() => { if (window.confirm('Delete this collection?')) onDelete(collection.id); }}
          style={{ padding: '7px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 600, background: 'rgba(230,57,70,.08)', border: '1px solid rgba(230,57,70,.2)', borderRadius: 8, cursor: 'pointer' }}>
          Delete
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-2)' }}>No posts yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Save posts to this collection from your feed</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
            {posts.map(p => {
              const media = p.media?.[0];
              const thumb = getMediaUrl(media?.thumbnail_url || media?.media_url);
              return (
                <div key={p.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'var(--border)', cursor: 'pointer' }}
                  onClick={() => setSelected(p)}>
                  <img src={thumb || `https://picsum.photos/seed/${p.id}/300/300`} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                    onError={e => { e.target.src = `https://picsum.photos/seed/${p.id}/300/300`; }} />
                  {/* Remove button */}
                  <button onClick={e => { e.stopPropagation(); removePost(p.id); }}
                    style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Post viewer modal */}
          {selected && (
            <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button onClick={() => setSelected(null)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <PostCard post={selected} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Main Collections Page ────────────────────────────────────
const CollectionsPage = () => {
  const [collections, setCollections] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [showCreate,  setShowCreate]  = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/posts/collections')
      .then(({ data }) => setCollections(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createCollection = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/posts/collections', { name: newName.trim() });
      setCollections(prev => [{ ...data, post_count: 0 }, ...prev]);
      setNewName('');
      setShowCreate(false);
      toast.success('Collection created!');
    } catch { toast.error('Failed to create'); }
    finally { setCreating(false); }
  };

  const deleteCollection = async (id) => {
    try {
      await api.delete(`/posts/collections/${id}`);
      setCollections(prev => prev.filter(c => c.id !== id));
      setSelected(null);
      toast.success('Collection deleted');
    } catch { toast.error('Failed to delete'); }
  };

  if (selected) {
    return <CollectionDetail collection={selected} onBack={() => { setSelected(null); load(); }} onDelete={deleteCollection} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Saved collections</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{collections.length} collection{collections.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ fontSize: 13, padding: '9px 18px' }}>
          + New
        </button>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} maxWidth={380}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 16 }}>New collection</div>
        <div style={{ padding: 20 }}>
          <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Collection name…" autoFocus style={{ marginBottom: 14, fontSize: 15 }}
            onKeyDown={e => e.key === 'Enter' && createCollection()} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowCreate(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
            <button onClick={createCollection} disabled={!newName.trim() || creating} className="btn btn-primary" style={{ flex: 2 }}>
              {creating ? <Spinner size={15} color="#fff" /> : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Collections grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
      ) : collections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🗂️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>No collections yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Create collections to organise your saved posts</div>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: '11px 28px' }}>
            Create first collection
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
          {collections.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              style={{ cursor: 'pointer', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)', transition: 'all .2s', boxShadow: 'var(--shadow)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
            >
              {/* Cover image */}
              <div style={{ aspectRatio: '1', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                {c.cover_url ? (
                  <img src={getMediaUrl(c.cover_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display='none'; }} />
                ) : (
                  <div style={{ fontSize: 48, opacity: .5 }}>🗂️</div>
                )}
                {/* Post count badge */}
                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10, backdropFilter: 'blur(4px)' }}>
                  {formatCount(c.post_count)} posts
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {+c.post_count === 0 ? 'Empty' : `${formatCount(c.post_count)} saved post${+c.post_count !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionsPage;
