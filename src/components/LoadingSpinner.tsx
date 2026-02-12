import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { spinner: 24, border: 2 },
  md: { spinner: 40, border: 3 },
  lg: { spinner: 56, border: 4 },
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
  message,
  size = 'md'
}) => {
  const { spinner, border } = sizeMap[size];

  return (
    <div className="loading-spinner-container">
      <div
        className="loading-spinner"
        style={{
          width: spinner,
          height: spinner,
          borderWidth: border,
        }}
        role="status"
        aria-label={message || 'Loading'}
      />
      {message && (
        <p className="loading-spinner-message">{message}</p>
      )}
      <style>{`
        .loading-spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          gap: 1rem;
        }

        .loading-spinner {
          border-style: solid;
          border-color: var(--bg-tertiary);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loading-spinner-message {
          color: var(--text-secondary);
          font-size: 0.875rem;
          text-align: center;
          margin: 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
});

export default LoadingSpinner;
