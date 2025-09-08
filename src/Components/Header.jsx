import React from 'react';
import { useNavigate } from 'react-router-dom';
import collabridgeLogo from '../Assets/Collabridge logo R 1 2 1.png';

const Header = ({ onUpload, hasData, onLogout, isLoggedIn }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
  };

  return (
    <>
      <header
        style={{
          width: '100%',
          background: 'linear-gradient(90deg, #f3f4f6 0%, #e0e7ff 100%)',
          boxShadow: '0 2px 8px rgba(60,72,88,0.08)',
          padding: 0,
          marginBottom: 0,
          position: 'relative',
          zIndex: 100,
        }}
      >
        <div
          className="header-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 16px',
            minHeight: 64,
            boxSizing: 'border-box',
            gap: 12,
          }}
        >
          {/* Brand / Logo on left */}
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
            <img
              src={collabridgeLogo}
              alt="Collabridge Logo"
              style={{
                height: '26px',
                width: '210px ',
                margin: 0,
                display: 'block',
                filter: 'drop-shadow(0 2px 8px rgba(60,72,88,0.08))',
              }}
            />
          </div>

          {/* Center title */}
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              minWidth: 120,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            <h2
              style={{
                marginRight: '70px',
                fontSize: '22px',
                fontWeight: 700,
                color: '#1e293b',
                letterSpacing: 1,
                lineHeight: 1.2,
              }}
            >
              Accounts Management
            </h2>
          </div>

          {/* Actions on right (logout) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isLoggedIn && (
              <button
                onClick={handleLogoutClick}
                style={{
                  background: 'linear-gradient(90deg, #e53935 0%, #fbc2c2 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 15,
                  boxShadow: '0 2px 8px rgba(60,72,88,0.08)',
                  transition: 'background 0.2s',
                  minWidth: 90,
                }}
                aria-label="Logout"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      {/* Responsive styles */}
      <style>
        {`
          @media (max-width: 600px) {
            .header-content {
              flex-direction: column;
              align-items: center !important;
              min-height: 100px !important;
              padding: 12px 8px !important;
              gap: 0 !important;
            }
            .header-content > div {
              width: 100% !important;
              justify-content: center !important;
              text-align: center !important;
              margin-bottom: 8px !important;
            }
            .header-content > div:first-child {
              margin-bottom: 4px !important;
            }
            .header-content img {
              height: 36px !important;
              margin-bottom: 4px !important;
            }
            .header-content h2 {
              font-size: 19px !important;
              margin-bottom: 4px !important;
              letter-spacing: 0.5px !important;
            }
            .header-content button {
              font-size: 14px !important;
              padding: 8px 12px !important;
              min-width: 80px !important;
            }
          }
        `}
      </style>
    </>
  );
};

export default Header;
