import React from 'react';
import { Tooltip, IconButton } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface ErrorTooltipProps {
  errorMessage: string;
}

const ErrorTooltip: React.FC<ErrorTooltipProps> = ({ errorMessage }) => {

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Tooltip title={
          <span className={'error-tooltip-message'} style={{ textAlign:"center" }}>
            {errorMessage}
          </span>
        }>
        <IconButton size="large" style={{ marginLeft: 4 }}>
          <WarningAmberIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </span>
  );
}
export default ErrorTooltip;