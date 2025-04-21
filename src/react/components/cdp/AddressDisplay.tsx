import React, { useState } from 'react';
import { Tooltip, IconButton } from '@mui/material';
import { useTheme}  from '../../../contexts/ThemeContext';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface AddressDisplayProps {
  address: string;
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({ address: address }) => {
  const [copied, setCopied] = useState(false);
  const { isDarkMode } = useTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
  };

  const truncatedLender = `${address.slice(0, 4)}...${address.slice(52, 56)}`;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Tooltip title={address}>
        <span>{truncatedLender}</span>
      </Tooltip>
      <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
        <IconButton onClick={handleCopy} size="small" style={{ marginLeft: 4 }}>
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
        <img
          className="account-logo"
          src={isDarkMode ? '/EQUITX-Logo-Circle-Gray-Outline.svg' : '/EQUITX-Logo-Circle-Dark-Outline.svg'}
        />
    </span>
  );
};

export default AddressDisplay;