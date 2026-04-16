import { useState, useCallback, useRef } from 'react';

/**
 * Generic cursor-based infinite-scroll hook.
 * fetchFn must return { data: { posts: [], nextCursor } }
 */
export const useInfiniteScroll = (fetchFn, params = {}) => {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const cursor = useRef(null);

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await fetchFn({ ...params, cursor: reset ? undefined : cursor.current, limit: 12 });
      const newItems = data.posts || data;
      cursor.current = data.nextCursor || null;
      setHasMore(!!data.nextCursor);
      setItems(prev => reset ? newItems : [...prev, ...newItems]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, JSON.stringify(params)]);

  const refresh = () => { cursor.current = null; load(true); };

  return { items, loading, hasMore, load, refresh, setItems };
};

/**
 * Toggle like on a post — optimistic update.
 */
export const usePostLike = (setItems) => {
  return useCallback((postId, likePost, unlikePost) => {
    setItems(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const liked = !p.is_liked;
      const count = liked ? +p.like_count + 1 : +p.like_count - 1;
      return { ...p, is_liked: liked, like_count: count };
    }));
    // Fire API (ignore errors for optimistic UX)
  }, [setItems]);
};