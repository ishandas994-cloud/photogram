import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { postsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/post/PostCard';
import CommentSection from '../components/post/CommentSection';
import { Spinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const PostDetailPage = () => {
  const { id }            = useParams();
  const { user }          = useAuth();
  const navigate          = useNavigate();
  const [post,    setPost]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postsAPI.getPost(id)
      .then(({ data }) => setPost(data))
      .catch(() => { toast.error('Post not found'); navigate('/'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await postsAPI.deletePost(id);
      toast.success('Post deleted');
      navigate(-1);
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <Spinner size={32} />
    </div>
  );

  if (!post) return null;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 60px' }}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: post card */}
        <div>
          <PostCard post={post} />
        </div>

        {/* Right: comments */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Comments</h3>
            {user?.id === post.user_id && (
              <button onClick={handleDelete} style={{ fontSize: 12, color: 'var(--accent)' }}>Delete post</button>
            )}
          </div>
          <CommentSection postId={post.id} postOwnerId={post.user_id} />
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;