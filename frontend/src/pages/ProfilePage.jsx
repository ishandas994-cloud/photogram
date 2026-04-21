import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usersAPI, postsAPI, messagesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import { Spinner, Skeleton } from '../components/ui/Spinner';
import { getMediaUrl, formatCount } from '../utils/helpers';
import toast from 'react-hot-toast';

const PostGrid = ({ username }) => {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postsAPI.getExplore({ limit: 18 })
      .then(({ data }) => setPosts(data.filter(p => p.username === username)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
      {Array(9).fill(0).map((_, i) => <Skeleton key={i} height={200} radius={0} />)}
    </div>
  );

  if (!posts.length) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
      <div style={{ fontSize: 15 }}>No posts yet</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
      {posts.map(post => {
        const thumb = post.thumbnail ? getMediaUrl(post.thumbnail) : `https://picsum.photos/seed/${post.id}/400/400`;
        return (
          <Link key={post.id} to={`/posts/${post.id}`} style={{ display: 'block', aspectRatio: '1', overflow: 'hidden', background: '#eee' }}>
            <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
              onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            />
          </Link>
        );
      })}
    </div>
  );
};

const ProfilePage = () => {
  const { username }              = useParams();
  const { user: me, updateUser }  = useAuth();
  const navigate                  = useNavigate();
  const [profile,  setProfile]    = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [following, setFollowing] = useState(false);

  const isMe = me?.username === username;

  useEffect(() => {
    setLoading(true);
    usersAPI.getProfile(username)
      .then(({ data }) => {
        setProfile(data);
        setFollowing(data.follow_status === 'accepted');
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [username]);

  const handleFollow = async () => {
    try {
      if (following) {
        await usersAPI.unfollow(username);
        setFollowing(false);
        setProfile(p => ({ ...p, follower_count: +p.follower_count - 1 }));
      } else {
        const { data } = await usersAPI.follow(username);
        setFollowing(data.status === 'accepted');
        if (data.status === 'accepted') setProfile(p => ({ ...p, follower_count: +p.follower_count + 1 }));
      }
    } catch { toast.error('Action failed'); }
  };

  const handleMessage = async () => {
    try {
      const { data } = await messagesAPI.createConversation({ recipient_id: profile.id });
      navigate('/messages/' + data.id);
    } catch { toast.error('Could not start conversation'); }
  };

  if (loading) return (
    <div style={{ maxWidth: 935, margin: '0 auto', padding: '40px 16px' }}>
      <div style={{ display: 'flex', gap: 40, marginBottom: 40 }}>
        <Skeleton width={150} height={150} radius={75} />
        <div style={{ flex: 1 }}>
          <Skeleton width={200} height={22} style={{ marginBottom: 16 }} />
          <Skeleton width={300} height={14} style={{ marginBottom: 12 }} />
          <Skeleton width={250} height={14} />
        </div>
      </div>
    </div>
  );

  if (!profile) return null;

  return (
    <div style={{ maxWidth: 935, margin: '0 auto', padding: '40px 16px 60px' }}>
      {/* Profile header */}
      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap' }}>
        <Avatar user={profile} size="2xl" />

        <div style={{ flex: 1, minWidth: 260 }}>
          {/* Username row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 400 }}>{profile.username}</h1>
            {profile.is_verified && <span style={{ color: 'var(--blue)', fontSize: 18 }}>✓</span>}

            {isMe ? (
              <Link to="/settings/profile" className="btn btn-outline" style={{ fontSize: 13, padding: '7px 16px' }}>
                Edit profile
              </Link>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleFollow}
                  className={`btn ${following ? 'btn-outline' : 'btn-primary'}`}
                  style={{ fontSize: 13, padding: '7px 16px' }}
                >
                  {following ? 'Following' : profile.follow_status === 'pending' ? 'Requested' : 'Follow'}
                </button>
                <button onClick={handleMessage} className="btn btn-outline" style={{ fontSize: 13, padding: '7px 16px' }}>Message</button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
            {[
              { label: 'posts',     value: profile.post_count },
              { label: 'followers', value: profile.follower_count },
              { label: 'following', value: profile.following_count },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{formatCount(value)}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          {profile.full_name && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{profile.full_name}</div>}
          {profile.bio && <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-line', marginBottom: 4 }}>{profile.bio}</div>}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontSize: 14 }}>
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>

      {/* Private gate */}
      {profile.private && !isMe ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>This account is private</div>
          <div style={{ fontSize: 14 }}>Follow to see their photos and videos</div>
        </div>
      ) : (
        <>
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: 16 }} />
          <PostGrid username={username} />
        </>
      )}
    </div>
  );
};

export default ProfilePage;
