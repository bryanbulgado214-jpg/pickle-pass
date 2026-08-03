import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { C } from '../lib/constants';
import { LOGO_LOCKUP } from '../lib/logos';

export default function AuthScreen() {
  const { signUp, signIn } = useAuth();
  const [view, setView] = useState('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (view === 'signup') {
        const data = await signUp(email, password, name);
        if (data.user && !data.session) {
          setConfirmSent(true);
        }
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="auth">
        <div className="authHero">
          <div className="authCourtLines" />
          <div className="authBrand">
            <img src={LOGO_LOCKUP} alt="Pickle Pass" className="authLogoImg" />
          </div>
        </div>
        <div className="authBody" style={{ textAlign: 'center' }}>
          <h2 className="h1" style={{ marginBottom: 12 }}>Check your email</h2>
          <p style={{ color: C.sand, fontSize: 14, lineHeight: 1.5 }}>
            We sent a confirmation link to <b style={{ color: C.ball }}>{email}</b>.
            Click it to activate your account, then come back here to log in.
          </p>
          <button
            className="cta"
            style={{ marginTop: 20 }}
            onClick={() => { setConfirmSent(false); setView('login'); }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="authHero">
        <div className="authCourtLines" />
        <div className="authBrand">
          <img src={LOGO_LOCKUP} alt="Pickle Pass" className="authLogoImg" />
        </div>
      </div>
      <div className="authBody">
        <form onSubmit={handleSubmit}>
          {view === 'signup' && (
            <div className="formRow">
              <label>Full name</label>
              <input
                className="input"
                placeholder="Juan Dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="formRow">
            <label>Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="formRow">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder={view === 'signup' ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && (
            <p style={{ color: C.coral, fontSize: 13, marginTop: 10 }}>{error}</p>
          )}
          <button className="cta" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : view === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>
        <div className="authSwap">
          {view === 'signup' ? (
            <>Already have an account?{' '}
              <button className="linkBtn" onClick={() => { setView('login'); setError(null); }}>
                Log in
              </button>
            </>
          ) : (
            <>New here?{' '}
              <button className="linkBtn" onClick={() => { setView('signup'); setError(null); }}>
                Create account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
