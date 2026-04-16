import React, { useState, useEffect } from 'react';
import { storiesAPI } from '../../api';
import Avatar from '../ui/Avatar';
import StoryViewer from './StoryViewer';

const StoriesBar = () => {
  const [stories,  setStories]  = useState([]);
  const [viewing,  setViewing]  = useState(null); // index

  useEffect(() => {
    storiesAPI.getFeed()
      .then(({ data }) => setStories(data))
      .catch(() => {});
  }, []);

  if (!stories.length) return null;

  return (
    <>
      <div style={{
        display: 'flex', gap: 16, overflowX: 'auto', padding: '16px 0 12px',
        scrollbarWidth: 'none',
      }}>
        {stories.map((s, i) => (
          <div
            key={s.user_id}
            onClick={() => setViewing(i)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}
          >
            <Avatar
              user={{ username: s.username, avatar_url: s.avatar_url }}
              size="lg"
              hasStory={!s.all_viewed}
            />
            <span style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.username}
            </span>
          </div>
        ))}
      </div>

      {viewing !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
};

export default StoriesBar;