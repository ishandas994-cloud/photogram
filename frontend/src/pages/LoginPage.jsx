import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [login,    setLogin]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login: doLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login.trim() || !password) return;
    setLoading(true);
    try {
      await doLogin(login.trim(), password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(230,57,70,.08) 0%, transparent 40%), radial-gradient(circle at 85% 30%, rgba(69,123,157,.08) 0%, transparent 40%)',
      padding: 24,
    }}>

      <div style={{
        position: 'fixed', top: '10%', left: '5%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(230,57,70,.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'float 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(69,123,157,.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'float 8s ease-in-out infinite',
        animationDelay: '1s',
      }} />

      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn .5s cubic-bezier(.4,0,.2,1) both' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 48, fontWeight: 400, marginBottom: 8,
            background: 'linear-gradient(135deg, #e63946, #f4a261, #457b9d)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'gradientShift 4s ease infinite',
          }}>
            Photogram
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Sign in to your account</p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,.07)',
          animation: 'fadeIn .5s .1s cubic-bezier(.4,0,.2,1) both',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ animation: 'fadeIn .4s .15s both' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Username or email
              </label>
              <input className="input" value={login} onChange={e => setLogin(e.target.value)} autoFocus required style={{ fontSize: 15 }} />
            </div>

            <div style={{ animation: 'fadeIn .4s .2s both' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Password
              </label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ fontSize: 15 }} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8, width: '100%', padding: 13,
                fontSize: 15, fontWeight: 600,
                fontFamily: 'var(--font)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? 'rgba(26,25,23,.4)' : 'linear-gradient(135deg, #1a1917, #3a3834)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                transition: 'all .2s cubic-bezier(.4,0,.2,1)',
                animation: 'fadeIn .4s .25s both',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.2)'; }}
            >
              {loading ? <Spinner size={18} color="#fff" /> : 'Log in'}
            </button>

          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-2)', animation: 'fadeIn .4s .3s both' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, transition: 'opacity .15s' }}
            onMouseEnter={e => e.target.style.opacity = '.7'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            Sign up
          </Link>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;