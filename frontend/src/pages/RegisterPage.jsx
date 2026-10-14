import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Mail, User, Lock, Type, ArrowRight, CheckCircle } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';

// ── Validation helpers ──
const validateName = (v) => /^[A-Za-z][A-Za-z ]*$/.test(v) ? '' : 'Name must contain only alphabets and spaces';
const validateUsername = (v) => /^[A-Za-z]{4,}[^\s]*$/.test(v) ? '' : 'Username must start with at least 4 letters and have no spaces';
const validateEmail = (v) => /^[A-Za-z0-9._%+\-]{3,}@gmail\.com$/.test(v) ? '' : 'Must be a valid @gmail.com address (at least 3 chars before @)';
const validatePassword = (v) => v.length >= 8 ? '' : 'Password must be at least 8 characters';

// ── Defined OUTSIDE RegisterPage so React never remounts it on re-render ──
function InputField({ id, label, icon: Icon, type = 'text', value, error, onChange, extra }) {
  return (
    <div className="input-group">
      <label className="input-label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <Icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          id={id}
          type={type}
          className={`input ${error ? 'error' : ''}`}
          style={{ paddingLeft: 40 }}
          value={value}
          onChange={onChange}
          placeholder={label}
        />
        {extra}
      </div>
      {error && <span className="input-error">⚠ {error}</span>}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1); // 1=form, 2=otp
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const validate = () => {
    const e = {
      name: validateName(form.name),
      username: validateUsername(form.username),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
    };
    setErrors(e);
    return !Object.values(e).some(Boolean);
  };

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
    const validators = { name: validateName, username: validateUsername, email: validateEmail, password: validatePassword };
    setErrors((p) => ({ ...p, [field]: validators[field]?.(val) || '' }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register(form);
      toast.success('OTP sent to your Gmail! Check your inbox.');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { toast.error('Please enter the OTP'); return; }
    setOtpLoading(true);
    try {
      await authApi.verifyOtp({ email: form.email, otp });
      toast.success('Account verified! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendOtp(form.email);
      toast.success('A new OTP has been sent to your email!');
      setResendCooldown(60);
      setOtp('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✦ ContentHub</div>
        <p className="auth-subtitle">
          {step === 1 ? 'Create your account — join the community' : 'Enter the OTP sent to your Gmail'}
        </p>

        {step === 1 ? (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InputField id="name" label="Full Name" icon={Type} field="name"
              value={form.name} error={errors.name} onChange={handleChange('name')} />
            <InputField id="username" label="Username" icon={User} field="username"
              value={form.username} error={errors.username} onChange={handleChange('username')} />
            <InputField id="email" label="Gmail Address" icon={Mail} field="email" type="email"
              value={form.email} error={errors.email} onChange={handleChange('email')} />
            <InputField
              id="password"
              label="Password"
              icon={Lock}
              field="password"
              type={showPw ? 'text' : 'password'}
              value={form.password}
              error={errors.password}
              onChange={handleChange('password')}
              extra={
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 4 }}>
              <div>✓ Name: alphabets and spaces only</div>
              <div>✓ Username: ≥4 letters, no spaces</div>
              <div>✓ Email: ≥3 chars before @gmail.com</div>
              <div>✓ Password: ≥8 characters</div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <span className="spinner" /> : <><ArrowRight size={16} /> Create Account</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={48} color="var(--accent-green)" style={{ marginBottom: 12 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                We sent a 6-digit OTP to <strong style={{ color: 'var(--text-accent)' }}>{form.email}</strong>
              </p>
            </div>
            <div className="input-group">
              <label className="input-label">Enter OTP</label>
              <input
                className="input"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 12, fontWeight: 700 }}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={otpLoading}>
              {otpLoading ? <span className="spinner" /> : <><CheckCircle size={16} /> Verify &amp; Activate</>}
            </button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                style={{
                  background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-secondary)',
                  fontSize: 13, fontWeight: 600, padding: 0,
                }}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        <div className="divider" />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
