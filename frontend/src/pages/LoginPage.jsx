import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, LogIn, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Login state
  const [creds, setCreds] = useState({ usernameOrEmail: '', password: '' });

  // Forgot / Reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({ otp: '', newPassword: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!creds.usernameOrEmail || !creds.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login(creds);
      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name}! ✨`);
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9._%+\-]{3,}@gmail\.com$/.test(forgotEmail)) {
      toast.error('Enter a valid Gmail address');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      toast.success('OTP sent to your Gmail!');
      setMode('reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email not found');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (resetData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email: forgotEmail, ...resetData });
      toast.success('Password reset! Please log in.');
      setMode('login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✦ ContentHub</div>

        {mode === 'login' && (
          <>
            <p className="auth-subtitle">Welcome back! Sign in to continue</p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Username or Gmail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 40 }}
                    placeholder="username or email@gmail.com"
                    value={creds.usernameOrEmail}
                    onChange={(e) => setCreds(p => ({ ...p, usernameOrEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 40, paddingRight: 44 }}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Your password"
                    value={creds.password}
                    onChange={(e) => setCreds(p => ({ ...p, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="button" onClick={() => setMode('forgot')}
                style={{ color: 'var(--accent-secondary)', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>
                Forgot password?
              </button>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <span className="spinner" /> : <><LogIn size={16} /> Sign In</>}
              </button>
            </form>

            <div className="divider" />
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              New to ContentHub?{' '}
              <Link to="/register" style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>Create account</Link>
            </p>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <p className="auth-subtitle">Enter your Gmail to receive an OTP</p>
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Gmail Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 40 }}
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <span className="spinner" /> : <><KeyRound size={16} /> Send Reset OTP</>}
              </button>
              <button type="button" onClick={() => setMode('login')} className="btn btn-ghost w-full">
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </form>
          </>
        )}

        {mode === 'reset' && (
          <>
            <p className="auth-subtitle">Enter the OTP and set a new password</p>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">OTP Code</label>
                <input
                  className="input"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  style={{ textAlign: 'center', fontSize: 24, letterSpacing: 12, fontWeight: 700 }}
                  value={resetData.otp}
                  onChange={(e) => setResetData(p => ({ ...p, otp: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">New Password (≥8 chars)</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 40 }}
                    type={showPw ? 'text' : 'password'}
                    placeholder="New password"
                    value={resetData.newPassword}
                    onChange={(e) => setResetData(p => ({ ...p, newPassword: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <span className="spinner" /> : <><CheckCircle size={16} /> Reset Password</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
