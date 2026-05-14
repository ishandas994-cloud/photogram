import React from 'react';
import { getAvatarUrl } from '../../utils/helpers';

const sizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  '2xl': 112,
};

const Avatar = ({
  user,
  size = 'md',
  hasStory = false,
  onClick,
  className = '',
}) => {

  const px = sizes[size] || sizes.md;

  // uploaded avatar
  const uploadedAvatar = getAvatarUrl(
    user?.avatar_url,
    user?.username
  );

  // fallback random avatar
  const fallbackAvatar =
    `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.username || 'user'}`;

  // final image
  const finalAvatar =
    user?.avatar_url
      ? uploadedAvatar
      : fallbackAvatar;

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        padding: hasStory ? 2 : 0,
        background: hasStory
          ? 'linear-gradient(135deg,#f9a825,#e63946,#c62a47)'
          : 'transparent',
      }}
    >
      <img
        src={finalAvatar}
        alt={user?.username || 'user'}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          border: hasStory ? '2px solid #fafaf8' : 'none',
          background: 'var(--surface-2)',
        }}
        onError={(e) => {
          e.target.src = fallbackAvatar;
        }}
      />
    </div>
  );
};

export default Avatar;