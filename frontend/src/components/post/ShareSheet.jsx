import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { messagesAPI, storiesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { getMediaUrl } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ShareSheet = ({ post, onClose }) => {
  const { user }                          = useAuth();
  const [tab,          setTab]            = useState('send');
  const [convs,        setConvs]          = useState([]);
  const [selected,     setSelected]       = useState(new Set());
  const [message,      setMessage]        = useState('');
  const [sending,      setSending]        = useState(false);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [copied,       setCopied]         = useState(false);
  const [addingStory,  setAddingStory]    = useState(false);
  const [searchQ,      setSearchQ]        = useState('');
  const [sentTo,       setSentTo]         = useState(new Set());

  const media    = post.media?.[0];
  const thumb    = getMediaUrl(media?.thumbnail_url || media?.media_url);
  const postLink = `${window.location.origin}/posts/${post.id}`;

  useEffect(() => {
    messagesAPI.getConversations()
      .then(({ data }) => setConvs(data))
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, []);

  const filtered = convs.filter(c => {
    const name = c.is_group ? c.name : c.members?.[0]?.username || '';
    return name.toLowerCase().includes(searchQ.toLowerCase());
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSend = async () => {
    if (!selected.size) { toast.error('Select at least one person'); return; }
    setSending(true);
    try {
      await Promise.all([...selected].map(convId =>
        messagesAPI.sendMessage(convId, {
          type:    'text',
          content: message.trim() || `Check out this post 👀\n${postLink}`,
        })
      ));
      setSentTo(prev => new Set([...prev, ...selected]));
      setSelected(new Set());
      toast.success(`Sent to ${selected.size} ${selected.size === 1 ? 'person' : 'people'} ✅`);
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const handleShareToStory = async () => {
    setAddingStory(true);
    try {
      const canvas  = document.createElement('canvas');
      canvas.width  = 1080; canvas.height = 1920;
      const ctx     = canvas.getContext('2d');

      // Dark background
      const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, '#1a1917');
      grad.addColorStop(1, '#2d2c29');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Draw thumbnail in center
      if (thumb) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise(res => { img.onload = res; img.onerror = res; img.src = thumb; });
        if (img.naturalWidth > 0) {
          const aspect = img.naturalWidth / img.naturalHeight || 1;
          const w = 920, h = w / aspect;
          const x = (1080 - w) / 2, y = (1920 - h) / 2 - 100;
          ctx.save();
          const r = 56;
          ctx.beginPath();
          ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
          ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
          ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
          ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
          ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); ctx.clip();
          ctx.drawImage(img, x, y, w, h);
          ctx.restore();
        }
      }

      // Username
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`@${post.username}`, 540, 1800);

      // Photogram label
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.font = '36px sans-serif';
      ctx.fillText('Shared from Photogram', 540, 1860);

      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
      const file = new File([blob], 'story-share.jpg', { type: 'image/jpeg' });
      const fd   = new FormData();
      fd.append('media', file);
      fd.append('caption', `Check out @${post.username}'s post! 🔥`);
      await storiesAPI.createStory(fd);
      toast.success('Added to your story! 🎉');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add to story');
    } finally { setAddingStory(false); }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postLink);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch { toast.error('Could not copy'); }
  };

  const tabs = [
    { id: 'send',  icon: '✈', label: 'Send' },
    { id: 'story', icon: '◎', label: 'Story' },
    { id: 'link',  icon: '🔗', label: 'Link' },
  ];

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn .2s ease' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 560, maxHeight: '88vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .28s cubic-bezier(.4,0,.2,1)', overflow: 'hidden' }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-2)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: 'var(--border)', flexShrink: 0 }}>
            {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = `https://picsum.photos/seed/${post.id}/100/100`; }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Share post</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{post.username}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', flexShrink: 0 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: '12px 0', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? 'var(--text-1)' : 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `2.5px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`, transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── SEND TAB ── */}
        {tab === 'send' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px' }}>
              <input className="input" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search people…" style={{ fontSize: 14 }} autoFocus />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
              {loadingConvs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>
                  {searchQ ? `No results for "${searchQ}"` : 'No conversations yet.\nStart a DM first.'}
                </div>
              ) : (
                filtered.map(conv => {
                  const other   = conv.members?.[0];
                  const name    = conv.is_group ? (conv.name || 'Group') : other?.username;
                  const isSel   = selected.has(conv.id);
                  const wasSent = sentTo.has(conv.id);
                  return (
                    <div key={conv.id} onClick={() => !wasSent && toggleSelect(conv.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: wasSent ? 'default' : 'pointer', background: isSel ? 'rgba(230,57,70,.06)' : wasSent ? 'rgba(45,106,79,.06)' : 'transparent', transition: 'background .15s', marginBottom: 2 }}
                      onMouseEnter={e => { if (!isSel && !wasSent) e.currentTarget.style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { if (!isSel && !wasSent) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Avatar user={other || { username: name }} size="md" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        {conv.last_message && <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message.content}</div>}
                      </div>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${wasSent ? 'var(--green)' : isSel ? 'var(--accent)' : 'var(--border-2)'}`, background: wasSent ? 'var(--green)' : isSel ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0 }}>
                        {wasSent ? <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span> : isSel ? <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span> : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selected.size > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
                <input className="input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a message… (optional)" style={{ flex: 1, fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <button onClick={handleSend} disabled={sending}
                  style={{ padding: '10px 22px', fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: sending ? .7 : 1, transition: 'opacity .15s' }}>
                  {sending ? <Spinner size={14} color="#fff" /> : `Send (${selected.size})`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STORY TAB ── */}
        {tab === 'story' && (
          <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, overflowY: 'auto' }}>
            {/* Story preview card */}
            <div style={{ width: 170, height: 300, borderRadius: 18, overflow: 'hidden', background: '#1a1917', position: 'relative', boxShadow: '0 12px 40px rgba(0,0,0,.3)', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1a1917,#2d2c29)' }} />
              {thumb && (
                <div style={{ position: 'absolute', inset: '16px 10px 40px', borderRadius: 10, overflow: 'hidden' }}>
                  <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = `https://picsum.photos/seed/${post.id}/200/300`; }} />
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>@{post.username}</div>
              <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(230,57,70,.9)', borderRadius: 5, padding: '2px 6px', fontSize: 8, fontWeight: 700, color: '#fff' }}>Photogram</div>
            </div>

            <div style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6, maxWidth: 300 }}>
              This reel will appear in your story as a sticker. Followers can tap it to open the original post.
            </div>

            <button onClick={handleShareToStory} disabled={addingStory} className="btn btn-primary"
              style={{ padding: '14px 0', fontSize: 15, fontWeight: 700, borderRadius: 16, width: '100%', maxWidth: 300 }}>
              {addingStory ? <><Spinner size={16} color="#fff" /> Adding…</> : '+ Add to your story'}
            </button>
          </div>
        )}

        {/* ── LINK TAB ── */}
        {tab === 'link' && (
          <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            {/* Link box */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', background: 'var(--border)', flexShrink: 0 }}>
                {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.src = `https://picsum.photos/seed/${post.id}/100/100`; }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>@{post.username}'s post</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{postLink}</div>
              </div>
            </div>

            {/* Copy button */}
            <button onClick={handleCopyLink}
              style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 700, background: copied ? 'var(--green)' : 'var(--text-1)', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', transition: 'background .25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {copied ? '✓ Copied!' : '🔗 Copy link'}
            </button>

            {/* Share options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: '📧', label: 'Email',    fn: () => window.open(`mailto:?subject=Check this out!&body=${postLink}`) },
                { icon: '💬', label: 'WhatsApp', fn: () => window.open(`https://wa.me/?text=${encodeURIComponent('Check this out! ' + postLink)}`) },
                { icon: '🐦', label: 'Twitter',  fn: () => window.open(`https://twitter.com/intent/tweet?text=Check this out!&url=${encodeURIComponent(postLink)}`) },
                { icon: '📋', label: 'Copy',     fn: handleCopyLink },
              ].map(opt => (
                <button key={opt.label} onClick={opt.fn}
                  style={{ padding: '13px', borderRadius: 12, fontSize: 13, fontWeight: 600, border: '1.5px solid var(--border)', color: 'var(--text-1)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                >
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ShareSheet;
