import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const VideoCall = ({ conversation, otherUser, onClose }) => {
  const { user }  = useAuth();
  const socketCtx = useSocket();

  const [status,   setStatus]   = useState('calling'); // calling | ringing | connected | ended
  const [muted,    setMuted]    = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef        = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef       = useRef(null);
  const SimplePeer     = useRef(null);

  // Load simple-peer dynamically
  useEffect(() => {
    import('simple-peer').then(m => { SimplePeer.current = m.default || m; });
  }, []);

  // Get user media and start call
  useEffect(() => {
    startCall();
    return () => cleanup();
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socketCtx) return;

    const offAccepted = socketCtx.onEvent('call_accepted', ({ signal }) => {
      peerRef.current?.signal(signal);
      setStatus('connected');
      startTimer();
    });

    const offRejected = socketCtx.onEvent('call_rejected', () => {
      setStatus('ended');
      setTimeout(onClose, 1500);
    });

    const offEnded = socketCtx.onEvent('call_ended', () => {
      setStatus('ended');
      setTimeout(onClose, 1500);
    });

    const offIce = socketCtx.onEvent('ice_candidate', ({ candidate }) => {
      try { peerRef.current?.signal({ type: 'candidate', candidate }); } catch {}
    });

    return () => { offAccepted(); offRejected(); offEnded(); offIce(); };
  }, [socketCtx]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true, audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      if (!SimplePeer.current) {
        // Wait for SimplePeer to load
        await new Promise(r => setTimeout(r, 500));
      }

      const peer = new SimplePeer.current({
        initiator: true,
        trickle: false,
        stream,
      });

      peer.on('signal', (signal) => {
        socketCtx?.socket.current?.emit('call_user', {
          to:         otherUser.id,
          from:       user.id,
          signal,
          callerName: user.username,
        });
      });

      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setStatus('ended');
      });

      peerRef.current = peer;
      setStatus('ringing');
    } catch (err) {
      console.error('Camera/mic error:', err);
      setStatus('ended');
      setTimeout(onClose, 1500);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const cleanup = () => {
    clearInterval(timerRef.current);
    peerRef.current?.destroy();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  };

  const hangUp = useCallback(() => {
    socketCtx?.socket.current?.emit('call_ended', { to: otherUser.id });
    cleanup();
    onClose();
  }, [socketCtx, otherUser, onClose]);

  const toggleMute = () => {
    const audio = localStreamRef.current?.getAudioTracks()[0];
    if (audio) { audio.enabled = !audio.enabled; setMuted(m => !m); }
  };

  const toggleVideo = () => {
    const video = localStreamRef.current?.getVideoTracks()[0];
    if (video) { video.enabled = !video.enabled; setVideoOff(v => !v); }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const statusText = {
    calling:   'Starting call…',
    ringing:   `Calling ${otherUser?.username}…`,
    connected: formatDuration(duration),
    ended:     'Call ended',
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>

      {/* Remote video (full screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          display: status === 'connected' ? 'block' : 'none',
        }}
      />

      {/* Waiting screen */}
      {status !== 'connected' && (
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(255,255,255,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, margin: '0 auto 20px',
            animation: status === 'ringing' ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}>
            {otherUser?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
            {otherUser?.username}
          </div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 15 }}>
            {statusText[status]}
          </div>
        </div>
      )}

      {/* Call duration */}
      {status === 'connected' && (
        <div style={{
          position: 'absolute', top: 24,
          color: '#fff', fontSize: 16, fontWeight: 600,
          background: 'rgba(0,0,0,.4)',
          padding: '6px 16px', borderRadius: 20, zIndex: 10,
        }}>
          {formatDuration(duration)}
        </div>
      )}

      {/* Local video (picture-in-picture) */}
      <div style={{
        position: 'absolute', bottom: 120, right: 20,
        width: 120, height: 160, borderRadius: 12,
        overflow: 'hidden', border: '2px solid rgba(255,255,255,.3)',
        zIndex: 10,
        display: videoOff ? 'none' : 'block',
      }}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute', bottom: 40,
        display: 'flex', gap: 20, zIndex: 10,
      }}>

        {/* Mute */}
        <button
          onClick={toggleMute}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: muted ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.15)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, transition: 'all .2s',
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🎤'}
        </button>

        {/* Hang up */}
        <button
          onClick={hangUp}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#e63946',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, transition: 'all .2s',
            boxShadow: '0 4px 20px rgba(230,57,70,.5)',
          }}
          title="End call"
        >
          📵
        </button>

        {/* Toggle video */}
        <button
          onClick={toggleVideo}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: videoOff ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.15)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, transition: 'all .2s',
          }}
          title={videoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {videoOff ? '📵' : '📹'}
        </button>

      </div>
    </div>,
    document.body
  );
};

export default VideoCall;
