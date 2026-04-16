import React, { useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { postsAPI } from '../api';
import { useInfiniteScroll } from '../hooks/usePosts';
import PostCard from '../components/post/PostCard';
import StoriesBar from '../components/story/StoriesBar';
import { PostSkeleton, Spinner } from '../components/ui/Spinner';

const HomePage = () => {
  const fetchFeed = useCallback((params) => postsAPI.getFeed(params), []);
  const { items: posts, loading, hasMore, load } = useInfiniteScroll(fetchFeed);

  const { ref, inView } = useInView({ threshold: 0.1 });

  // Initial load
  useEffect(() => { load(true); }, []);

  // Load more when sentinel comes into view
  useEffect(() => {
    if (inView && hasMore && !loading) load();
  }, [inView]);

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 16px 40px' }}>
      {/* Stories tray */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 16px', marginTop: 24, marginBottom: 20 }}>
        <StoriesBar />
      </div>

      {/* Feed skeleton */}
      {loading && posts.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3].map(i => <PostSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Your feed is empty</div>
          <div style={{ fontSize: 14 }}>Follow people to see their posts here</div>
        </div>
      )}

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={ref} style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          {loading && <Spinner size={24} />}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          You're all caught up ✓
        </p>
      )}
    </div>
  );
};

export default HomePage;