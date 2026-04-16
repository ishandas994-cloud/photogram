import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [form,    setForm]    = useState({ username: '', email: '', full_name: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate     = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 400 }}>Photogram</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 6 }}>Sign up to share your moments</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, boxShadow: 'var(--shadow)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Full name</label>
              <input className="input" value={form.full_name} onChange={set('full_name')} placeholder="Your name" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Username</label>
              <input className="input" value={form.username} onChange={set('username')} placeholder="letters, numbers, . _" required minLength={3} maxLength={30} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Password</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={8} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, width: '100%', padding: 11 }}>
              {loading ? <Spinner size={16} color="#fff" /> : 'Create account'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-2)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 500 }}>Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;