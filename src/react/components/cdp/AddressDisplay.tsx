import React, { useState } from 'react';
import { Tooltip, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface AddressDisplayProps {
  lender: string;
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({ lender }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(lender);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
  };

  const truncatedLender = `${lender.slice(0, 5)}...`;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Tooltip title={lender}>
        <span>{truncatedLender}</span>
      </Tooltip>
      <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
        <IconButton onClick={handleCopy} size="small" style={{ marginLeft: 4 }}>
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </div>
  );
};

export default AddressDisplay;
