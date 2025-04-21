import { useTheme } from '../../contexts/ThemeContext';

import { Box } from '@mui/material';
import Connect from './connect';

export default function ViewHeader() {
  const { isDarkMode } = useTheme();

  return (
    <Box sx={{ display: 'block', paddingBottom: '16px'}}>
      <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          { isDarkMode ? 
            (<img
                className='header-brand'
                src='/EQUITX-Logo-White-Horizontal.svg'
              />
            ) : (<img
                className='header-brand'
                src='/EQUITX-Logo-DarkGray-Horizontal.svg'
              />
            )}
          <Connect />
        </div>
        
        <hr style={{ width: '100%', border: '1px solid #E0E0E0', margin: '16px 0' }} />
    </Box>
  );
}