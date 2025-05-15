'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { Slide, ToastContainer, toast, ToastOptions } from 'react-toastify';
import { isValueEncrypted } from '@aiostreams/utils';

interface CustomConfig {
  key: string;
  value: string;
}

const toastOptions: ToastOptions = {
  autoClose: 5000,
  hideProgressBar: true,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: 'touch',
  style: {
    borderRadius: '8px',
    backgroundColor: '#ededed',
    color: 'black',
  },
};

const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' | 'warning',
  id?: string
) => {
  toast[type](message, {
    ...toastOptions,
    toastId: id,
  });
};

const isValidBase64 = (value: string): boolean => {
  try {
    JSON.parse(atob(value));
    return true;
  } catch {
    return false;
  }
};

const isValidBase64Compressed = (value: string): boolean => {
  if (value.startsWith('B-')) return true;
  return false;
};

const isValidConfigFormat = (value: string): boolean => {
  return value
    ? isValueEncrypted(value) ||
        isValidBase64(value) ||
        isValidBase64Compressed(value)
    : false;
};

const handleCopyEvent = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast('Copied to clipboard!', 'success');
    })
    .catch((error: Error) => {
      console.error(error);
      showToast('Failed to copy to clipboard.', 'error');
    });
};

const CopyButton = ({ text }: { text: string }) => (
  <button
    className={styles.icon}
    onClick={() => {
      handleCopyEvent(text);
    }}
  >
    <svg
      width="24px"
      height="24px"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="#ffffff"
      strokeWidth="0.00024000000000000003"
    >
      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
      <g
        id="SVGRepo_tracerCarrier"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></g>
      <g id="SVGRepo_iconCarrier">
        {' '}
        <path
          d="M19.53 8L14 2.47C13.8595 2.32931 13.6688 2.25018 13.47 2.25H11C10.2707 2.25 9.57118 2.53973 9.05546 3.05546C8.53973 3.57118 8.25 4.27065 8.25 5V6.25H7C6.27065 6.25 5.57118 6.53973 5.05546 7.05546C4.53973 7.57118 4.25 8.27065 4.25 9V19C4.25 19.7293 4.53973 20.4288 5.05546 20.9445C5.57118 21.4603 6.27065 21.75 7 21.75H14C14.7293 21.75 15.4288 21.4603 15.9445 20.9445C16.4603 20.4288 16.75 19.7293 16.75 19V17.75H17C17.7293 17.75 18.4288 17.4603 18.9445 16.9445C19.4603 16.4288 19.75 15.7293 19.75 15V8.5C19.7421 8.3116 19.6636 8.13309 19.53 8ZM14.25 4.81L17.19 7.75H14.25V4.81ZM15.25 19C15.25 19.3315 15.1183 19.6495 14.8839 19.8839C14.6495 20.1183 14.3315 20.25 14 20.25H7C6.66848 20.25 6.35054 20.1183 6.11612 19.8839C5.8817 19.6495 5.75 19.3315 5.75 19V9C5.75 8.66848 5.8817 8.35054 6.11612 8.11612C6.35054 7.8817 6.66848 7.75 7 7.75H8.25V15C8.25 15.7293 8.53973 16.4288 9.05546 16.9445C9.57118 17.4603 10.2707 17.75 11 17.75H15.25V19ZM17 16.25H11C10.6685 16.25 10.3505 16.1183 10.1161 15.8839C9.8817 15.6495 9.75 15.3315 9.75 15V5C9.75 4.66848 9.8817 4.35054 10.1161 4.11612C10.3505 3.8817 10.6685 3.75 11 3.75H12.75V8.5C12.7526 8.69811 12.8324 8.88737 12.9725 9.02747C13.1126 9.16756 13.3019 9.24741 13.5 9.25H18.25V15C18.25 15.3315 18.1183 15.6495 17.8839 15.8839C17.6495 16.1183 17.3315 16.25 17 16.25Z"
          fill="#ffffff"
        ></path>{' '}
      </g>
    </svg>
  </button>
);

export default function CustomConfigGenerator() {
  const [configs, setConfigs] = useState<CustomConfig[]>([]);
  const [newConfig, setNewConfig] = useState<CustomConfig>({
    key: '',
    value: '',
  });
  const [output, setOutput] = useState<string | null>(null);

  const extractConfigValue = (value: string): string => {
    try {
      const url = new URL(value);
      const pathParts = url.pathname.split('/');
      const longUniqueId = pathParts[pathParts.length - 2];
      return longUniqueId;
    } catch {
      return value;
    }
  };

  const validateKeyValuePair = (key: string, value: string) => {
    if (!key || !value) {
      showToast('Both key and value are required.', 'error', 'requiredFields');
      return false;
    }
    if (!isValidConfigFormat(value)) {
      showToast(
        'Invalid configuration format.',
        'error',
        'invalidConfigFormat'
      );
      return false;
    }
    return true;
  };

  const handleAddRow = () => {
    if (
      !validateKeyValuePair(newConfig.key, extractConfigValue(newConfig.value))
    )
      return;
    if (configs.some((config) => config.key === newConfig.key)) {
      showToast('Key already exists.', 'error', 'uniqueKeyConstraintViolation');
      return false;
    }
    newConfig.value = extractConfigValue(newConfig.value);
    setConfigs([...configs, newConfig]);
    setNewConfig({ key: '', value: '' });
  };

  const handleDeleteRow = (index: number) => {
    const newConfigs = configs.filter((_, i) => i !== index);
    setConfigs(newConfigs);
  };

  const handleChange = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const newConfigs = configs.map((config, i) =>
      i === index ? { ...config, [field]: value } : config
    );
    setConfigs(newConfigs);
  };

  const generateJson = () => {
    if (configs.length === 0) {
      showToast('No configurations to generate.', 'error', 'noConfigs');
      setOutput(null);
      return;
    }
    configs.forEach(({ key, value }) => {
      if (!validateKeyValuePair(key, value)) {
        setOutput(null);
        return;
      }
    });

    const json = configs.reduce(
      (acc, { key, value }) => {
        if (key) acc[key] = value;
        return acc;
      },
      {} as { [key: string]: string }
    );
    // double stringify to escape the quotes
    setOutput(JSON.stringify(json));
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <h1 style={{ textAlign: 'center' }}>AIOStreams</h1>
          </div>
          <p style={{ textAlign: 'center', padding: '15px' }}>
            This tool allows you to generate the value needed for the{' '}
            <code>CUSTOM_CONFIGS</code> environment variable.
          </p>
        </div>
        <div className={styles.section}>
          <h2 style={{ padding: '5px' }}>Your Configurations</h2>
          <p style={{ padding: '5px' }}>
            Add your configurations below. Put the name of the configuration in
            the key field and the manifest URL in the value field.
          </p>
          <div className={styles.help}>
            <h3
              style={{
                textAlign: 'center',
                fontSize: '1.2em',
                marginBottom: '10px',
              }}
            >
              How to get the config value?
            </h3>
            <p style={{ textAlign: 'left' }}>
              Once you have configured AIOStreams, upon clicking the{' '}
              <code>Generate Manifest URL</code> button, make sure to click the{' '}
              <code>Copy URL</code> button at the configuration page. You then
              paste that URL in the value field below.
            </p>
          </div>

          {configs.map((config, index) => (
            <div key={index} className={styles.row}>
              <input
                type="text"
                placeholder="Key"
                value={config.key}
                onChange={(e) => handleChange(index, 'key', e.target.value)}
                className={styles.keyInput}
              />
              <input
                type="text"
                placeholder="Value"
                value={config.value}
                onChange={(e) => handleChange(index, 'value', e.target.value)}
                className={styles.valueInput}
              />
              <button
                onClick={() => handleDeleteRow(index)}
                className={styles.icon}
              >
                <svg
                  fill="#ffffff"
                  height="24px"
                  width="24px"
                  version="1.1"
                  id="Layer_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 457.503 457.503"
                  xmlSpace="preserve"
                  stroke="#ffffff"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {' '}
                    <g>
                      {' '}
                      <g>
                        {' '}
                        <path d="M381.575,57.067h-90.231C288.404,25.111,261.461,0,228.752,0C196.043,0,169.1,25.111,166.16,57.067H75.929 c-26.667,0-48.362,21.695-48.362,48.362c0,26.018,20.655,47.292,46.427,48.313v246.694c0,31.467,25.6,57.067,57.067,57.067 h195.381c31.467,0,57.067-25.6,57.067-57.067V153.741c25.772-1.02,46.427-22.294,46.427-48.313 C429.936,78.761,408.242,57.067,381.575,57.067z M165.841,376.817c0,8.013-6.496,14.509-14.508,14.509 c-8.013,0-14.508-6.496-14.508-14.509V186.113c0-8.013,6.496-14.508,14.508-14.508c8.013,0,14.508,6.496,14.508,14.508V376.817z M243.26,376.817c0,8.013-6.496,14.509-14.508,14.509c-8.013,0-14.508-6.496-14.508-14.509V186.113 c0-8.013,6.496-14.508,14.508-14.508c8.013,0,14.508,6.496,14.508,14.508V376.817z M320.679,376.817 c0,8.013-6.496,14.509-14.508,14.509c-8.013,0-14.509-6.496-14.509-14.509V186.113c0-8.013,6.496-14.508,14.509-14.508 s14.508,6.496,14.508,14.508V376.817z"></path>{' '}
                      </g>{' '}
                    </g>{' '}
                  </g>
                </svg>
              </button>
            </div>
          ))}
          <div className={styles.row}>
            <input
              type="text"
              placeholder="Config Name"
              value={newConfig.key}
              onChange={(e) =>
                setNewConfig({ ...newConfig, key: e.target.value })
              }
              className={styles.keyInput}
            />
            <input
              type="text"
              placeholder="Value"
              value={newConfig.value}
              onChange={(e) =>
                setNewConfig({ ...newConfig, value: e.target.value })
              }
              className={styles.valueInput}
            />
            <button onClick={handleAddRow} className={styles.icon}>
              <svg
                fill="#ffffff"
                version="1.1"
                id="Capa_1"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                width="24px"
                height="24px"
                viewBox="0 0 45.402 45.402"
                xmlSpace="preserve"
                stroke="#ffffff"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {' '}
                  <g>
                    {' '}
                    <path d="M41.267,18.557H26.832V4.134C26.832,1.851,24.99,0,22.707,0c-2.283,0-4.124,1.851-4.124,4.135v14.432H4.141 c-2.283,0-4.139,1.851-4.138,4.135c-0.001,1.141,0.46,2.187,1.207,2.934c0.748,0.749,1.78,1.222,2.92,1.222h14.453V41.27 c0,1.142,0.453,2.176,1.201,2.922c0.748,0.748,1.777,1.211,2.919,1.211c2.282,0,4.129-1.851,4.129-4.133V26.857h14.435 c2.283,0,4.134-1.867,4.133-4.15C45.399,20.425,43.548,18.557,41.267,18.557z"></path>{' '}
                  </g>{' '}
                </g>
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.section}>
          <h2 style={{ padding: '5px' }}>Generate JSON Output</h2>
          <p style={{ padding: '5px' }}>
            Click the <code>Generate</code> button to generate the JSON output.
            This is the value you need to set for the{' '}
            <code>CUSTOM_CONFIGS</code> environment variable.
          </p>
          <div className={styles.buttonContainer}>
            <button onClick={generateJson} className={styles.button}>
              Generate
            </button>
          </div>

          {output && (
            <div className={styles.outputContainer}>
              <h3 style={{ padding: '5px' }}>Output</h3>
              <textarea
                style={{ height: '200px', margin: '5px' }}
                value={output}
                readOnly
                className={styles.output}
              ></textarea>
            </div>
          )}

          {output && (
            <div className={styles.buttonContainer}>
              <button
                className={styles.button}
                onClick={() => handleCopyEvent(output)}
              >
                Copy
              </button>
            </div>
          )}
        </div>
        {output && (
          <div className={`${styles.section} ${styles.envSection}`}>
            <h2>Setting the environment variable</h2>
            <p>
              Set the <code>CUSTOM_CONFIGS</code> environment variable to the
              value generated above. You can either manually use the value above
              or use the following commands to set it in a <code>.env</code>{' '}
              file. Ensure you are running these commands in the root directory
              of AIOStreams.
            </p>
            <p style={{ marginTop: '10px' }}>
              <strong>Windows:</strong>
            </p>
            <div className={styles.envCommand}>
              <input
                type="text"
                readOnly
                value={`Add-Content -Path .env -Value 'CUSTOM_CONFIGS=${output}'`}
                className={styles.envInput}
              />
              <CopyButton
                text={`Add-Content -Path .env -Value 'CUSTOM_CONFIGS=${output}'`}
              />
            </div>
            <p style={{ marginTop: '10px' }}>
              <strong>Linux/Mac:</strong>
            </p>
            <div className={styles.envCommand}>
              <input
                type="text"
                readOnly
                value={`echo CUSTOM_CONFIGS=${JSON.stringify(output).slice(1, -1)} >> .env`}
                className={styles.envInput}
              />
              <CopyButton
                text={`echo CUSTOM_CONFIGS=${JSON.stringify(output).slice(1, -1)} >> .env`}
              />
            </div>
          </div>
        )}
      </div>
      <ToastContainer
        stacked
        position="top-center"
        transition={Slide}
        draggablePercent={30}
      />
    </div>
  );
}
