import React, { useEffect, useRef } from 'react';
import styles from './InstallWindow.module.css';
import { toast } from 'react-toastify';
import { toastOptions } from './Toasts';

interface InstallWindowProps {
  manifestUrl: string | null;
  setManifestUrl: (url: string | null) => void;
}

const InstallWindow: React.FC<InstallWindowProps> = ({
  manifestUrl,
  setManifestUrl,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutSideClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setManifestUrl(null);
      }
    };

    window.addEventListener('mousedown', handleOutSideClick);

    return () => {
      window.removeEventListener('mousedown', handleOutSideClick);
    };
  }, [ref, setManifestUrl]);

  return (
    <div
      className={`${styles.popup}${!manifestUrl ? ` ${styles.hidden}` : ''}`}
      ref={ref}
    >
      <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>
        Install Addon
      </h2>
      <p style={{ marginBottom: '10px', textAlign: 'center' }}>
        Click the buttons below to install the addon
      </p>
      <div className={styles.installButtons}>
        <a
          className={styles.installButton}
          href={(manifestUrl || '').replace(/https?:\/\//, 'stremio://')}
          // ensure a tag fills the button
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
          target="_blank"
        >
          Stremio
        </a>
        <a
          className={styles.installButton}
          target="_blank"
          href={`https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl || '')}`}
          // ensure a tag fills the button
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Stremio Web
        </a>
        <button
          className={styles.installButton}
          onClick={() => {
            const id = toast.loading('Copying to clipboard...');
            if (!navigator.clipboard) {
              toast.update(id, {
                ...toastOptions,
                type: 'error',
                render: 'Failed to copy to clipboard',
                isLoading: false,
                autoClose: 3000,
              });
              return;
            }

            navigator.clipboard
              .writeText(manifestUrl || '')
              .then(() => {
                toast.update(id, {
                  ...toastOptions,
                  type: 'success',
                  render: 'Copied to clipboard',
                  isLoading: false,
                  autoClose: 3000,
                  toastId: 'copied',
                });
              })
              .catch(() => {
                toast.update(id, {
                  ...toastOptions,
                  type: 'error',
                  render: 'Failed to copy to clipboard',
                  isLoading: false,
                  autoClose: 3000,
                });
              });
          }}
        >
          Copy
        </button>
      </div>
    </div>
  );
};

export default InstallWindow;
