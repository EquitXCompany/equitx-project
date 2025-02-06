import { Box, Grid, Paper, Typography } from '@mui/material';
import { useCdps } from '../hooks/useCdps';
import { useStakers } from '../hooks/useStakers';
import BigNumber from 'bignumber.js';

export default function Dashboard() {
  const { data: cdps, isLoading: cdpsLoading } = useCdps();
  const { data: stakers, isLoading: stakersLoading } = useStakers();

  const totalCDPs = cdps?.length || 0;
  const totalStakers = stakers?.length || 0;
  const totalValueLocked = cdps?.reduce(
    (acc, cdp) => acc.plus(cdp.xlm_deposited),
    new BigNumber(0)
  );

  const StatCard = ({ title, value, isLoading }: { title: string; value: string | number; isLoading: boolean }) => (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" component="p">
        {isLoading ? '...' : value}
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Total CDPs"
            value={totalCDPs}
            isLoading={cdpsLoading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Total Stakers"
            value={totalStakers}
            isLoading={stakersLoading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Total Value Locked (XLM)"
            value={totalValueLocked?.toString() || '0'}
            isLoading={cdpsLoading}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
