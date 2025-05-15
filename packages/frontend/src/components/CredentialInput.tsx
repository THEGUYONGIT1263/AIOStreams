import React from 'react';
import styles from './CredentialInput.module.css';
import { isValueEncrypted } from '@aiostreams/utils';

interface CredentialInputProps {
  credential: string;
  setCredential: (credential: string) => void;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

const CredentialInput: React.FC<CredentialInputProps> = ({
  credential,
  setCredential,
  inputProps = {},
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  return (
    <div className={styles.credentialsInputContainer}>
      <input
        type={showPassword ? 'text' : 'password'}
        value={
          isValueEncrypted(credential) ? '••••••••••••••••••••••••' : credential
        }
        onChange={(e) => setCredential(e.target.value.trim())}
        className={styles.credentialInput}
        {...inputProps}
        disabled={
          isValueEncrypted(credential) ? true : inputProps.disabled || false
        }
      />
      {!isValueEncrypted(credential) && (
        <button
          className={styles.showHideButton}
          onClick={() => {
            if (!isValueEncrypted(credential)) {
              setShowPassword(!showPassword);
            }
          }}
        >
          {showPassword ? (
            <svg
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></circle>
              </g>
            </svg>
          ) : (
            <svg
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <path
                  d="M2 2L22 22"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M6.71277 6.7226C3.66479 8.79527 2 12 2 12C2 12 5.63636 19 12 19C14.0503 19 15.8174 18.2734 17.2711 17.2884M11 5.05822C11.3254 5.02013 11.6588 5 12 5C18.3636 5 22 12 22 12C22 12 21.3082 13.3317 20 14.8335"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                <path
                  d="M14 14.2362C13.4692 14.7112 12.7684 15.0001 12 15.0001C10.3431 15.0001 9 13.657 9 12.0001C9 11.1764 9.33193 10.4303 9.86932 9.88818"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </g>
            </svg>
          )}
        </button>
      )}

      {isValueEncrypted(credential) && (
        <button
          className={styles.resetCredentialButton}
          onClick={() => setCredential('')}
        >
          <svg
            fill="#ffffff"
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            viewBox="0 0 52 52"
            enableBackground="new 0 0 52 52"
            xmlSpace="preserve"
            stroke="#ffffff"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              {' '}
              <g>
                {' '}
                <path d="M42,23H10c-2.2,0-4,1.8-4,4v19c0,2.2,1.8,4,4,4h32c2.2,0,4-1.8,4-4V27C46,24.8,44.2,23,42,23z M31,44.5 c-1.5,1-3.2,1.5-5,1.5c-0.6,0-1.2-0.1-1.8-0.2c-2.4-0.5-4.4-1.8-5.7-3.8l3.3-2.2c0.7,1.1,1.9,1.9,3.2,2.1c1.3,0.3,2.6,0,3.8-0.8 c2.3-1.5,2.9-4.7,1.4-6.9c-0.7-1.1-1.9-1.9-3.2-2.1c-1.3-0.3-2.6,0-3.8,0.8c-0.3,0.2-0.5,0.4-0.7,0.6L26,37h-9v-9l2.6,2.6 c0.4-0.4,0.9-0.8,1.3-1.1c2-1.3,4.4-1.8,6.8-1.4c2.4,0.5,4.4,1.8,5.7,3.8C36.2,36.1,35.1,41.7,31,44.5z"></path>{' '}
                <path d="M10,18.1v0.4C10,18.4,10,18.3,10,18.1C10,18.1,10,18.1,10,18.1z"></path>{' '}
                <path d="M11,19h4c0.6,0,1-0.3,1-0.9V18c0-5.7,4.9-10.4,10.7-10C32,8.4,36,13,36,18.4v-0.3c0,0.6,0.4,0.9,1,0.9h4 c0.6,0,1-0.3,1-0.9V18c0-9.1-7.6-16.4-16.8-16c-8.5,0.4-15,7.6-15.2,16.1C10.1,18.6,10.5,19,11,19z"></path>{' '}
              </g>{' '}
            </g>
          </svg>
        </button>
      )}
    </div>
  );
};

export default CredentialInput;
