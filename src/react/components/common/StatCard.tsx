import { 
  Box,
  Paper, 
  Skeleton,
  Tooltip, 
  Typography, 
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
  tooltip?: string;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  isLoading = false,
  tooltip,
}: StatCardProps) => {

  return (
    <Paper
      className="metric-card-paper-root"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: 2,
        height: '165px',
        width: '280px',
        borderRadius: '20px',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
        },
      }}
    >
      {isLoading ? (
        <Skeleton variant="text" width="80%" height={60} />
      ) : (
        <>
          <Typography 
            variant="h4" 
            component="p" 
            sx={{ 
              mt: '10px',
              mb: 1,
              fontWeight: 600,
              fontSize: 41
            }}
          >
            {value}
          </Typography>
        </>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box display="flex" alignItems="center" mb={1}>
          <Typography 
            variant="subtitle2" 
            component="h2" 
            sx={{ 
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {title.toUpperCase()}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoOutlined 
                sx={{ 
                  ml: 1,
                  fontSize: 16, 
                }} 
              />
            </Tooltip>
          )}
        </Box>

 
      </Box>
      {false && subtitle && (
        <Typography 
          variant="body2"
        >
          {subtitle}
        </Typography>
      )}
    </Paper>
  )
};