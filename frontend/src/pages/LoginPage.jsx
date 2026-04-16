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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 42, color: 'var(--text-1)', fontWeight: 400 }}>Photogram</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>Share your moments</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, boxShadow: 'var(--shadow)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Username or email</label>
              <input className="input" value={login} onChange={e => setLogin(e.target.value)} autoFocus required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 6, width: '100%', padding: '11px' }}>
              {loading ? <Spinner size={16} color="#fff" /> : 'Log in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-2)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 500 }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;