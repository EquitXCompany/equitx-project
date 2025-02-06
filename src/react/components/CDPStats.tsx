import { Box, Paper, Typography } from '@mui/material';
import { DataGrid, GridRenderCellParams } from '@mui/x-data-grid';
import { useCdps } from '../hooks/useCdps';
import { Link } from 'react-router-dom';

export default function CDPStats() {
  const { data: cdps, isLoading } = useCdps();

  const columns = [
    {
      field: 'contract_id',
      headerName: 'Contract ID',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Link to={`/cdps/${params.row.asset_symbol}`}>
          {params.row.contract_id}
        </Link>
      ),
    },
    { field: 'lender', headerName: 'Lender', width: 200 },
    {
      field: 'xlm_deposited',
      headerName: 'XLM Deposited',
      width: 150,
      valueFormatter: (params: { value: number }) => 
        params.value?.toString() || '0',
    },
    {
      field: 'asset_lent',
      headerName: 'Asset Lent',
      width: 150,
      valueFormatter: (params: { value: number }) => 
        params.value?.toString() || '0',
    },
    { field: 'status', headerName: 'Status', width: 120 },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 200,
      valueFormatter: (params: { value: string }) => 
        params.value ? new Date(params.value).toLocaleString() : '',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CDP Statistics
      </Typography>
      
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={cdps || []}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => `${row.contract_id}-${row.lender}`}
          pageSizeOptions={[10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}