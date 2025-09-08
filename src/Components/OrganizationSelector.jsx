import React from 'react';
import { ArrowLeft } from 'lucide-react';

const OrganizationSelector = ({ organizations, onSelect }) => (
  <div
    style={{
      width: '100%',
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f3f4f6 0%, #e0e7ff 100%)',
      padding: '32px 0',
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 16px',
      }}
    >
      <div
        className="org-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '28px',
        }}
      >
        {organizations.map((org) => {
          const IconComponent = org.icon;
          return (
            <div
              key={org.id}
              onClick={() => onSelect(org.id)}
              className="org-card"
              style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 4px 24px rgba(60,72,88,0.10)',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.2s',
                padding: 0,
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 8px 32px rgba(60,72,88,0.16)';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.border = `2px solid ${org.color}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 4px 24px rgba(60,72,88,0.10)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.border = '2px solid transparent';
              }}
            >
              <div
                className="org-card-content"
                style={{
                  width: '100%',
                  padding: '32px 18px 22px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  className="org-icon"
                  style={{
                    backgroundColor: org.color,
                    borderRadius: '50%',
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    boxShadow: '0 2px 8px rgba(60,72,88,0.10)',
                  }}
                >
                  <IconComponent size={32} color="#fff" />
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#1e293b',
                    margin: '0 0 6px 0',
                  }}
                >
                  {org.name}
                </h3>
                <p
                  style={{
                    fontSize: 15,
                    color: '#64748b',
                    margin: '0 0 16px 0',
                  }}
                >
                  {org.type}
                </p>
                <div
                  className="org-view-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background:
                      'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '7px 18px',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(60,72,88,0.08)',
                    marginTop: 8,
                    transition: 'background 0.2s',
                  }}
                >
                  View Dashboard
                  <ArrowLeft className="arrow-icon" size={20} color="#fff" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    {/* Mobile responsive styles */}
    <style>
      {`
        @media (max-width: 700px) {
          .org-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }
          .org-card-content {
            padding: 24px 10px 16px 10px !important;
          }
          .org-icon {
            width: 44px !important;
            height: 44px !important;
            margin-bottom: 12px !important;
          }
          .org-card h3 {
            font-size: 17px !important;
          }
          .org-card p {
            font-size: 13px !important;
            margin-bottom: 10px !important;
          }
          .org-view-btn {
            font-size: 14px !important;
            padding: 7px 12px !important;
          }
        }
      `}
    </style>
  </div>
);

export default OrganizationSelector;