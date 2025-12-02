import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      handleVerification(token);
    } else {
      setStatus('error');
      setError('No verification token provided');
    }
  }, [searchParams]);

  async function handleVerification(token) {
    try {
      await verifyEmail(token);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
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
          padding: '40px',
          textAlign: 'center'
        }}>
          {status === 'verifying' && (
            <>
              <div className="shimmer" style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%',
                margin: '0 auto 24px'
              }} />
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                marginBottom: '12px'
              }}>
                Verifying your email...
              </h1>
              <p style={{ color: '#666', fontSize: '14px' }}>
                Please wait a moment
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '24px'
              }}>
                ✅
              </div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                marginBottom: '12px'
              }}>
                Email verified!
              </h1>
              <p style={{ 
                color: '#666', 
                marginBottom: '24px',
                fontSize: '14px'
              }}>
                Your email has been successfully verified. You can now use all features.
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
                Go to Dashboard
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '24px'
              }}>
                ❌
              </div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                marginBottom: '12px'
              }}>
                Verification failed
              </h1>
              <p style={{ 
                color: '#ff6b6b', 
                marginBottom: '24px',
                fontSize: '14px'
              }}>
                {error}
              </p>
              <button
                onClick={() => navigate('/login')}
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
                Go to Login
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
