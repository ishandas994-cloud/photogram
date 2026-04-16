import React from 'react';

export const Spinner = ({ size = 20, color = 'var(--text-2)' }) => (
  <div
    className="spin"
    style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid transparent`,
      borderTopColor: color,
      flexShrink: 0,
    }}
  />
);

export const Skeleton = ({ width = '100%', height = 16, radius = 6, style = {} }) => (
  <div
    style={{
      width, height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'pulse 1.4s ease infinite',
      ...style,
    }}
  />
);

export const PostSkeleton = () => (
  <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Skeleton width={40} height={40} radius={20} />
      <div style={{ flex: 1 }}>
        <Skeleton width={120} height={13} style={{ marginBottom: 6 }} />
        <Skeleton width={80} height={11} />
      </div>
    </div>
    <Skeleton width="100%" height={300} radius={0} />
    <div style={{ padding: '12px 16px' }}>
      <Skeleton width={80} height={13} style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height={13} />
    </div>
  </div>
);