import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const EditProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate             = useNavigate();
  const [form, setForm]      = useState({
    full_name:  user?.full_name  || '',
    bio:        user?.bio        || '',
    website:    user?.website    || '',
    is_private: user?.is_private || false,
  });
  const [avatar,  setAvatar]  = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatar) fd.append('avatar', avatar);
      const { data } = await usersAPI.updateProfile(fd);
      updateUser(data);
      toast.success('Profile updated!');
      navigate(`/profile/${user.username}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 16px 60px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 28 }}>Edit profile</h2>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <Avatar user={{ ...user, avatar_url: preview || user?.avatar_url }} size="xl" />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{user?.username}</div>
            <label style={{ cursor: 'pointer', color: 'var(--blue)', fontSize: 14, fontWeight: 500 }}>
              Change photo
              <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full name</label>
            <input className="input" value={form.full_name} onChange={set('full_name')} maxLength={100} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Bio</label>
            <textarea className="input" value={form.bio} onChange={set('bio')} rows={3} maxLength={150} style={{ resize: 'none' }} />
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{form.bio.length}/150</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Website</label>
            <input className="input" type="url" value={form.website} onChange={set('website')} placeholder="https://yoursite.com" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <input type="checkbox" checked={form.is_private} onChange={set('is_private')} style={{ width: 16, height: 16, accentColor: 'var(--text-1)', cursor: 'pointer' }} />
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Private account</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Only approved followers can see your posts</div>
            </div>
          </label>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Spinner size={16} color="#fff" /> : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;