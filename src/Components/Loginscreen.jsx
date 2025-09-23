import React, { useState } from 'react';
import Header from './Header';
import { Eye, EyeOff, Building2, Lock, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LoginScreen = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.OrganizationID) {
        // Route to dashboard with user info
        navigate('/', {
          state: {
            userEmail: data.Email,
            organizationId: data.OrganizationID,
          },
        });
        if (onLogin) onLogin(data);
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      setIsLoading(false);
      alert('Login error');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Header isLoggedIn={false} />
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e0e7ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(60,72,88,0.12)',
            padding: '40px 32px',
            width: '100%',
            maxWidth: 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo and Title */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
                borderRadius: '50%',
                width: 56,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <Building2 color="#fff" size={32} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Accounts Management
            </h1>
            <p style={{ color: '#64748b', fontSize: 15, marginTop: 6 }}>
              Sign in to your account
            </p>
          </div>

          {/* Login Form */}
          <form style={{ width: '100%' }} onSubmit={handleLogin}>
            {/* Email Field */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Email Address
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f3f4f6',
                  borderRadius: 8,
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Mail size={18} color="#6366f1" style={{ marginRight: 8 }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 15,
                    flex: 1,
                  }}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f3f4f6',
                  borderRadius: 8,
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Lock size={18} color="#6366f1" style={{ marginRight: 8 }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 15,
                    flex: 1,
                  }}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: 8,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => alert('Forgot password functionality coming soon!')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  textDecoration: 'underline',
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 0',
                fontSize: 16,
                fontWeight: 600,
                cursor: isLoading || !email || !password ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(60,72,88,0.08)',
                marginBottom: 8,
                transition: 'background 0.2s',
              }}
            >
              {isLoading ? (
                <span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 18,
                      height: 18,
                      border: '2px solid #fff',
                      borderTop: '2px solid #6366f1',
                      borderRadius: '50%',
                      marginRight: 8,
                      verticalAlign: 'middle',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Signing in...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Sign In
                  <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </span>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 14 }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => alert('Sign up functionality coming soon!')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
                  fontWeight: 500,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 0,
                }}
              >
                Sign up for free
              </button>
            </span>
          </div>
        </div>
      </div>
      {/* Spinner animation keyframes */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg);}
            100% { transform: rotate(360deg);}
          }
        `}
      </style>
    </>
  );
};

export default LoginScreen;