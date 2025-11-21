import { Paper, Typography, Skeleton, Tooltip, Box } from "@mui/material";
import { InfoOutlined, TrendingUp, TrendingDown } from "@mui/icons-material";

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
  change,
}: MetricCardProps) => {
  const isPositiveChange = change && change > 0;
  const formattedChange = change ? Math.abs(change).toFixed(2) : null;

  return (
    <Paper
      className="metric-card-paper-root"
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        p: 3,
        height: "100%",
        minHeight: "165px",
        borderRadius: "var(--radius-xl)",
        border: 0,
        boxShadow: "none",
      }}
    >
      {change !== undefined && !isLoading && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: isPositiveChange ? "#648153" : "#D46565",
            px: 2,
            py: 1,
            borderRadius: "25px",
            mb: 1,
          }}
        >
          {isPositiveChange ? (
            <TrendingUp
              sx={{
                fontSize: 16,
                color: "white",
                mr: 0.5,
              }}
            />
          ) : (
            <TrendingDown
              sx={{
                fontSize: 16,
                color: "white",
                mr: 0.5,
              }}
            />
          )}
          <Typography
            variant="caption"
            sx={{
              color: "white",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {formattedChange}%
          </Typography>
        </Box>
      )}
      {isLoading ? (
        <Skeleton variant="text" width="80%" height={60} />
      ) : (
        <>
          <Typography
            variant="h4"
            component="p"
            sx={{
              mb: 1.5,
              fontWeight: 700,
              fontSize: "2rem",
              lineHeight: 1.2,
            }}
          >
            {value}
            {trend && (
              <Typography
                component="span"
                sx={{
                  ml: 1,
                  color: trend.isPositive ? "success.main" : "error.main",
                  fontSize: "1rem",
                }}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </Typography>
            )}
          </Typography>
        </>
      )}
      <Box display="flex" justifyContent="center" alignItems="center">
        <Typography
          variant="subtitle2"
          component="h2"
          sx={{
            fontWeight: 600,
            fontSize: "var(--font-size-sm)",
            textAlign: "center",
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
                opacity: 0.7,
              }}
            />
          </Tooltip>
        )}
      </Box>
      {subtitle && (
        <Typography
          variant="body2"
          sx={{
            mt: 0.5,
            opacity: 0.8,
            fontSize: "var(--font-size-xs)",
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};
