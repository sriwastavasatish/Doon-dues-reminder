import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back! 👋');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>📱</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 14, color: 'white', fontFamily: 'var(--font-display)' }}>
            Doon Dues<br />Reminder
          </h1>
          <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 320, lineHeight: 1.7, marginBottom: 40 }}>
            Automate school fee reminders via WhatsApp. Track payments, manage classes, and never miss a follow-up.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {[
              { icon: '📊', text: 'Real-time payment analytics & graphs' },
              { icon: '📅', text: 'Custom scheduled WhatsApp reminders' },
              { icon: '👨‍🏫', text: 'Admin & teacher role management' },
              { icon: '📂', text: 'Excel import with smart auto-mapping' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ fontSize: 22 }}>{f.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-form">
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📱</div>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-dark)', fontFamily: 'var(--font-display)' }}>Doon Dues Reminder</span>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Welcome back</h2>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>Sign in to your authorised account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-icon-wrap">
                <span className="input-icon">✉️</span>
                <input className="input" type="email" placeholder="you@school.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <span className="input-icon">🔒</span>
                <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text3)' }}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? '⏳ Signing in...' : '🚀 Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 32, padding: 16, background: 'var(--bg)', borderRadius: 10, fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
            <strong>🔐 Authorised users only.</strong><br />
            Contact your school administrator to get access credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
