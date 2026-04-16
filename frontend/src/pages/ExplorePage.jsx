import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { postsAPI } from '../api';
import { getMediaUrl, formatCount } from '../utils/helpers';
import { Skeleton, Spinner } from '../components/ui/Spinner';

const ExploreCell = ({ post }) => {
  const [hovered, setHovered] = useState(false);
  const thumb = post.thumbnail ? getMediaUrl(post.thumbnail) : `https://picsum.photos/seed/${post.id}/400/400`;

  return (
    <Link
      to={`/posts/${post.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'block', position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: 4, background: '#111' }}
    >
      <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s', transform: hovered ? 'scale(1.05)' : 'scale(1)' }} />
      {hovered && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, color: '#fff', fontSize: 15, fontWeight: 600 }}>
          <span>♥ {formatCount(post.like_count)}</span>
        </div>
      )}
      {post.type === 'carousel' && (
        <div style={{ position: 'absolute', top: 8, right: 8, color: '#fff', fontSize: 14 }}>⊞</div>
      )}
      {post.type === 'reel' && (
        <div style={{ position: 'absolute', top: 8, right: 8, color: '#fff', fontSize: 14 }}>▶</div>
      )}
    </Link>
  );
};

const ExplorePage = () => {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset,  setOffset]  = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { ref, inView } = useInView({ threshold: 0.1 });

  const load = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    try {
      const o = reset ? 0 : offset;
      const { data } = await postsAPI.getExplore({ limit: 30, offset: o });
      setPosts(prev => reset ? data : [...prev, ...data]);
      setOffset(o + data.length);
      setHasMore(data.length === 30);
    } catch {}
    finally { setLoading(false); }
  }, [offset, loading]);

  useEffect(() => { load(true); }, []);
  useEffect(() => { if (inView && hasMore && !loading) load(); }, [inView]);

  return (
    <div style={{ padding: '24px 16px 40px', maxWidth: 935, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, marginBottom: 20 }}>Explore</h2>

      {loading && posts.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
          {Array(12).fill(0).map((_, i) => <Skeleton key={i} height={0} style={{ aspectRatio:'1', height:'auto', paddingBottom:'100%' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
          {posts.map(post => <ExploreCell key={post.id} post={post} />)}
        </div>
      )}

      {hasMore && (
        <div ref={ref} style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          {loading && <Spinner size={24} />}
        </div>
      )}
    </div>
  );
};

export default ExplorePage; 