import React from 'react';
import { getAvatarUrl } from '../../utils/helpers';

const sizes = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80, '2xl': 112 };

const Avatar = ({ user, size = 'md', hasStory = false, onClick, className = '' }) => {
  const px = sizes[size] || sizes.md;
  const url = getAvatarUrl(user?.avatar_url, user?.username);

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: px, height: px, borderRadius: '50%', flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        padding: hasStory ? 2 : 0,
        background: hasStory
          ? 'linear-gradient(135deg,#f9a825,#e63946,#c62a47)'
          : 'transparent',
      }}
    >
      <img
        src={url}
        alt={user?.username || 'user'}
        style={{
          width: '100%', height: '100%', borderRadius: '50%',
          objectFit: 'cover',
          border: hasStory ? '2px solid #fafaf8' : 'none',
        }}
        onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/notionists/svg?seed=fallback`; }}
      />
    </div>
  );
};

export default Avatar;