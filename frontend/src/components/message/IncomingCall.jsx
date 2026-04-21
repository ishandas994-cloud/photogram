import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const IncomingCall = ({ callerName, onAccept, onReject }) => {
  const audioRef = useRef(null);

  // Play ringtone
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let stopped = false;

    const ring = () => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      setTimeout(ring, 1200);
    };
    ring();

    return () => { stopped = true; ctx.close(); };
  }, []);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000,
      background: 'rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        background: '#1a1917',
        borderRadius: 24,
        padding: '36px 48px',
        textAlign: 'center',
        width: 320,
        boxShadow: '0 20px 60px rgba(0,0,0,.5)',
        animation: 'fadeIn .3s ease',
      }}>
        {/* Pulsing avatar */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #e63946, #f4a261)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, color: '#fff', fontWeight: 700,
            margin: '0 auto',
          }}>
            {callerName?.[0]?.toUpperCase() || '?'}
          </div>
          {/* Pulse rings */}
          {[1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute',
              inset: -(i * 12),
              borderRadius: '50%',
              border: '2px solid rgba(230,57,70,.3)',
              animation: `pulse ${1 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>

        <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginBottom: 4 }}>
          Incoming video call
        </div>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 600, marginBottom: 32 }}>
          {callerName}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          {/* Reject */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onReject}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#e63946', border: 'none',
                cursor: 'pointer', fontSize: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px',
                transition: 'transform .15s',
                boxShadow: '0 4px 16px rgba(230,57,70,.4)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              📵
            </button>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Decline</div>
          </div>

          {/* Accept */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onAccept}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#2d6a4f', border: 'none',
                cursor: 'pointer', fontSize: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px',
                transition: 'transform .15s',
                boxShadow: '0 4px 16px rgba(45,106,79,.4)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              📹
            </button>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Accept</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IncomingCall;
