import React, { useState, useEffect } from 'react';
import styles from './FormatterPreview.module.css';
import { ParsedStream } from '@aiostreams/types';
import {
  gdriveFormat,
  torrentioFormat,
  torboxFormat,
  customFormat,
} from '@aiostreams/formatters';
import { parseFilename } from '@aiostreams/parser';
import { serviceDetails } from '@aiostreams/utils';

interface FormatterPreviewProps {
  formatter: string;
}

const FormatterPreview: React.FC<FormatterPreviewProps> = ({ formatter }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const DEFAULT_FILENAME =
    'Movie.Title.2023.2160p.BluRay.HEVC.DV.TrueHD.Atmos.7.1.iTA.ENG-GROUP.mkv';
  const DEFAULT_FOLDERNAME =
    'Movie.Title.2023.2160p.BluRay.HEVC.DV.TrueHD.Atmos.7.1.iTA.ENG-GROUP';
  // Create a sample stream for preview
  const [filename, setFilename] = React.useState<string>(DEFAULT_FILENAME);
  const [foldername, setFoldername] =
    React.useState<string>(DEFAULT_FOLDERNAME);
  const [indexers, setIndexers] = React.useState<string>('RARBG');
  const [seeders, setSeeders] = React.useState<number>(125);
  const [usenetAge, setUsenetAge] = React.useState<string>('10d'); // Days
  const [addonName, setAddonName] = React.useState<string>('Torrentio');
  const [providerId, setProviderId] = React.useState<string>('realdebrid');
  const [isCached, setIsCached] = React.useState<boolean>(true);
  const [isP2P, setIsP2P] = React.useState<boolean>(false);
  const [isPersonal, setIsPersonal] = React.useState<boolean>(false);
  const [duration, setDuration] = React.useState<number>(9120000); // 2h 32m
  const [fileSize, setFileSize] = React.useState<number>(62500000000); // 58.2 GB
  const [proxied, setProxied] = React.useState<boolean>(false); // Proxied or not
  const parsedInfo = parseFilename(filename);

  console.log(`Formatter: ${formatter}`);
  const sampleStream: ParsedStream = {
    ...parsedInfo,
    addon: {
      id: 'test-addon',
      name: addonName,
    },
    filename: filename,
    folderName: foldername !== filename ? foldername : undefined,
    size: fileSize,
    duration: duration, // 2h 32m
    provider:
      providerId === 'None' ? undefined : { id: providerId, cached: isCached },
    torrent: {
      seeders: seeders,
      infoHash: isP2P ? 'infoHash' : undefined,
    },
    indexers: indexers,
    usenet: {
      age: usenetAge,
    },
    type: providerId === 'usenet' ? 'usenet' : 'debrid',
    personal: isPersonal,
    proxied: proxied,
  };

  const getFormatterExample = () => {
    switch (formatter) {
      case 'gdrive':
        return gdriveFormat(sampleStream, false);
      case 'minimalistic-gdrive':
        return gdriveFormat(sampleStream, true);
      case 'torrentio':
        return torrentioFormat(sampleStream);
      case 'torbox':
        return torboxFormat(sampleStream);
      case 'imposter':
        return {
          name: 'ಞ AIOStreams 4K ಞ',
          description:
            'ಞ Sus: Very ಞ\nಞ Vented: Yes ಞ\nಞ Tasks: None ಞ\nಞ Crewmates: 0 ಞ',
        };
      default:
        if (formatter.startsWith('custom') && formatter.length > 7) {
          const jsonString = formatter.slice(7);
          const data = JSON.parse(jsonString);

          return customFormat(sampleStream, data);
        }
        return gdriveFormat(sampleStream, false);
    }
  };

  const example = getFormatterExample();

  const resetFilename = () => {
    setFilename(DEFAULT_FILENAME);
  };

  const resetFoldername = () => {
    setFoldername(DEFAULT_FOLDERNAME);
  };

  // Toggle switch component with animation fix
  const ToggleSwitch = ({
    label,
    isChecked,
    setChecked,
  }: {
    label: string;
    isChecked: boolean;
    setChecked: (checked: boolean) => void;
  }) => {
    const [visualState, setVisualState] = useState(isChecked);
    const [isAnimating, setIsAnimating] = useState(false);

    // Sync visual state with actual state
    useEffect(() => {
      if (!isAnimating) {
        setVisualState(isChecked);
      }
    }, [isChecked, isAnimating]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newState = e.target.checked;
      setIsAnimating(true);
      setVisualState(newState);

      // Allow animation to play before updating the actual state
      setTimeout(() => {
        setChecked(newState);
        // Reset animating state after animation completes
        setTimeout(() => {
          setIsAnimating(false);
        }, 50);
      }, 250); // Slightly shorter than the CSS transition duration
    };

    return (
      <div className={styles.toggleWrapper}>
        <label className={styles.toggleLabel}>
          <span>{label}</span>
          <div className={styles.toggleContainer}>
            <input
              type="checkbox"
              checked={visualState}
              onChange={handleChange}
              className={styles.toggleInput}
            />
            <span
              className={`${styles.toggleSwitch} ${isAnimating ? styles.animating : ''}`}
            ></span>
          </div>
        </label>
      </div>
    );
  };

  return (
    <div className={styles.customFormatterContainer}>
      <h3
        className={styles.customFormatterTitle}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Preview
        <span className={styles.expandIcon}>{isExpanded ? '▼' : '►'}</span>
      </h3>

      {isExpanded && (
        <div className={styles.customFormatterContent}>
          <p className={styles.customFormatterDescription}>
            This is a preview of how the formatter will look like. You can
            change the filename and other parameters to see how it affects the
            output.
            <br />
            <br />
            Note: The options here do not affect your configuration and are only
            for testing purposes.
          </p>

          {/* Formatter example display */}
          <div className={styles.streamPreview}>
            <div className={styles.streamName}>{example.name}</div>
            <div className={styles.streamDescription}>
              {example.description}
            </div>
          </div>

          {/* File name input with reset button */}
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Filename:</label>
            <div className={styles.filenameControls}>
              <div className={styles.filenameInputContainer}>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className={styles.filenameInput}
                />
              </div>
              <button
                className={styles.resetButton}
                onClick={resetFilename}
                title="Reset to default filename"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                >
                  <path
                    fill="currentColor"
                    d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Folder name input with reset button */}
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Folder Name:</label>
            <div className={styles.filenameControls}>
              <div className={styles.filenameInputContainer}>
                <input
                  type="text"
                  value={foldername}
                  onChange={(e) => setFoldername(e.target.value)}
                  className={styles.filenameInput}
                />
              </div>
              <button
                className={styles.resetButton}
                onClick={resetFoldername}
                title="Reset to default folder name"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                >
                  <path
                    fill="currentColor"
                    d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Small inputs in one row */}
          <div className={styles.formRow}>
            <div className={styles.formGroupSmall}>
              <label className={styles.inputLabel}>Indexer:</label>
              <input
                type="text"
                value={indexers}
                onChange={(e) => setIndexers(e.target.value)}
                className={styles.smallInput}
              />
            </div>

            <div className={styles.formGroupSmall}>
              <label className={styles.inputLabel}>Seeders:</label>
              <input
                type="number"
                value={seeders}
                onChange={(e) => setSeeders(Number(e.target.value))}
                className={styles.smallInput}
                min="0"
              />
            </div>

            <div className={styles.formGroupSmall}>
              <label className={styles.inputLabel}>Usenet Age:</label>
              <input
                type="text"
                value={usenetAge}
                onChange={(e) => setUsenetAge(e.target.value)}
                className={styles.smallInput}
                min="0"
              />
            </div>

            <div className={styles.formGroupSmall}>
              <label className={styles.inputLabel}>Duration (s):</label>
              <input
                type="number"
                value={
                  sampleStream.duration
                    ? sampleStream.duration / 1000
                    : undefined
                }
                onChange={(e) => setDuration(Number(e.target.value) * 1000)}
                className={styles.smallInput}
                min="0"
              />
            </div>

            <div className={styles.formGroupSmall}>
              <label className={styles.inputLabel}>File Size (bytes):</label>
              <input
                type="number"
                value={fileSize}
                onChange={(e) => setFileSize(Number(e.target.value))}
                className={styles.smallInput}
                min="0"
              />
            </div>
          </div>

          {/* Provider selection and toggle switches */}
          <div className={styles.formRow}>
            <div className={styles.formGroupMedium}>
              <label className={styles.inputLabel}>Provider:</label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className={styles.selectInput}
              >
                {serviceDetails
                  .filter((service) => service.id != 'orion')
                  .map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                <option value="None">None</option>
              </select>
            </div>

            <div className={styles.formGroupMedium}>
              <label className={styles.inputLabel}>Addon Name:</label>
              <input
                type="text"
                value={addonName}
                onChange={(e) => setAddonName(e.target.value)}
                className={styles.smallInput}
              />
            </div>
          </div>

          {/* Toggle switches in a more compact layout */}
          <div className={styles.togglesRow}>
            <ToggleSwitch
              label="Cached"
              isChecked={isCached}
              setChecked={setIsCached}
            />

            <ToggleSwitch label="P2P" isChecked={isP2P} setChecked={setIsP2P} />

            <ToggleSwitch
              label="Personal"
              isChecked={isPersonal}
              setChecked={setIsPersonal}
            />

            <ToggleSwitch
              label="Proxied"
              isChecked={proxied}
              setChecked={setProxied}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FormatterPreview;
