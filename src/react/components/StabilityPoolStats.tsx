import { Box, Paper, Typography } from '@mui/material';
import { DataGrid, type GridRenderCellParams, type GridValueFormatterParams } from '@mui/x-data-grid';
import { useStakers } from '../hooks/useStakers';
import { Link } from 'react-router-dom';

export default function StabilityPoolStats() {
  const { data: stakers, isLoading } = useStakers();

  const columns = [
    {
      field: 'asset_symbol',
      headerName: 'Asset',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Link to={`/stability-pool/${params.row.asset_symbol}`}>
          {params.row.asset_symbol}
        </Link>
      ),
    },
    { field: 'address', headerName: 'Staker Address', width: 200 },
    {
      field: 'staked_amount',
      headerName: 'Staked Amount',
      width: 150,
      valueFormatter: (params: GridValueFormatterParams) => 
        params.value?.toString() ?? '',
    },
    {
      field: 'rewards_earned',
      headerName: 'Rewards Earned',
      width: 150,
      valueFormatter: (params: GridValueFormatterParams) => 
        params.value?.toString() ?? '',
    },
    {
      field: 'last_claim_timestamp',
      headerName: 'Last Claim',
      width: 200,
      valueFormatter: (params: GridValueFormatterParams) => 
        params.value ? new Date(params.value).toLocaleString() : '',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Stability Pool Statistics
      </Typography>
      
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={stakers || []}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => `${row.asset_symbol}-${row.address}`}
          pageSizeOptions={[10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
