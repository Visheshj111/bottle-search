import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#000',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
            <div style={{ 
              width: '28px', 
              height: '28px', 
              background: 'linear-gradient(135deg, #fff, #888)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px'
            }}>
              ⚡
            </div>
            <span style={{ fontWeight: '600', fontSize: '16px', letterSpacing: '-0.3px' }}>bottleup</span>
          </Link>
        </header>

        {/* Success Message */}
        <main style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '40px 20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '400px',
            background: '#111',
            border: '1px solid #222',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '48px', 
              marginBottom: '24px'
            }}>
              ✉️
            </div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              marginBottom: '12px'
            }}>
              Check your email
            </h1>
            <p style={{ 
              color: '#666', 
              marginBottom: '24px',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              We've sent a verification link to <strong style={{ color: '#fff' }}>{email}</strong>. 
              Click the link to verify your account.
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '14px 28px',
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Continue to Dashboard
            </button>
            <p style={{ 
              color: '#555', 
              fontSize: '12px', 
              marginTop: '20px'
            }}>
              Didn't receive the email? Check your spam folder.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#000',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            background: 'linear-gradient(135deg, #fff, #888)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>
            ⚡
          </div>
          <span style={{ fontWeight: '600', fontSize: '16px', letterSpacing: '-0.3px' }}>bottleup</span>
        </Link>
      </header>

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: '#111',
          border: '1px solid #222',
          borderRadius: '16px',
          padding: '40px'
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            Create your account
          </h1>
          <p style={{ 
            color: '#666', 
            textAlign: 'center', 
            marginBottom: '32px',
            fontSize: '14px'
          }}>
            Start organizing your life today
          </p>

          {error && (
            <div style={{
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              color: '#ff6b6b',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                color: '#888', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#0a0a0a',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none'
                }}
                placeholder="Your name"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                color: '#888', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#0a0a0a',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none'
                }}
                placeholder="you@example.com"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                color: '#888', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#0a0a0a',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none'
                }}
                placeholder="Min. 6 characters"
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                color: '#888', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#0a0a0a',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none'
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#333' : '#fff',
                color: loading ? '#666' : '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p style={{ 
            textAlign: 'center', 
            marginTop: '24px', 
            color: '#666',
            fontSize: '14px'
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#fff', textDecoration: 'none', fontWeight: '500' }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
