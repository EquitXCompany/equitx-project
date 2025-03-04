import { Paper, Typography, Skeleton, Tooltip, Box } from '@mui/material';
import { InfoOutlined, TrendingUp, TrendingDown } from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
  tooltip?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  change?: number; // Add change parameter
}

export const MetricCard = ({
  title,
  value,
  subtitle,
  isLoading = false,
  tooltip,
  trend,
  change
}: MetricCardProps) => {
  const isPositiveChange = change && change > 0;
  const formattedChange = change ? Math.abs(change).toFixed(2) : null;

  return (
    <Paper 
      sx={{ 
        p: 2, 
        height: '100%', 
        bgcolor: 'rgba(0, 0, 0, 0.2)',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)'
        }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box display="flex" alignItems="center" mb={1}>
          <Typography 
            variant="subtitle2" 
            component="h2" 
            sx={{ 
              fontWeight: 500 
            }}
          >
            {title}
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

        {change !== undefined && !isLoading && (
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: isPositiveChange 
                ? 'rgba(45, 192, 113, 0.15)' 
                : 'rgba(255, 72, 66, 0.15)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {isPositiveChange ? (
              <TrendingUp 
                sx={{ 
                  fontSize: 16, 
                  color: 'success.main',
                  mr: 0.5 
                }} 
              />
            ) : (
              <TrendingDown 
                sx={{ 
                  fontSize: 16, 
                  color: 'error.main',
                  mr: 0.5 
                }} 
              />
            )}
            <Typography
              variant="caption"
              sx={{
                color: isPositiveChange ? 'success.main' : 'error.main',
                fontWeight: 500
              }}
            >
              {formattedChange}%
            </Typography>
          </Box>
        )}
      </Box>
      
      {isLoading ? (
        <Skeleton variant="text" width="80%" height={60} />
      ) : (
        <>
          <Typography 
            variant="h4" 
            component="p" 
            sx={{ 
              mb: 1,
              fontWeight: 500
            }}
          >
            {value}
            {trend && (
              <Typography
                component="span"
                sx={{
                  ml: 1,
                  color: trend.isPositive ? 'success.main' : 'error.main',
                  fontSize: '1rem'
                }}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </Typography>
            )}
          </Typography>
        </>
      )}
      
      {subtitle && (
        <Typography 
          variant="body2" 
        >
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};