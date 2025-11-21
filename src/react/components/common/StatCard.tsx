import { Box, Paper, Skeleton, Tooltip, Typography } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";

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
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        p: 3,
        height: "165px",
        minWidth: "240px",
        flexGrow: 1,
        borderRadius: "var(--radius-xl)",
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
              mb: 1.5,
              fontWeight: 700,
              fontSize: "2.5rem",
              lineHeight: 1.2,
            }}
          >
            {value}
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
            textTransform: "uppercase",
            letterSpacing: "0.05em",
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
