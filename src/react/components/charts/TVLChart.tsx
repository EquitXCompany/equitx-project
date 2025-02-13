import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Box, Paper, Typography } from '@mui/material';
import { formatCurrency } from '../../../utils/formatters';
import { ProtocolStatsData, TVLMetricsData } from '../../hooks/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TVLChartProps {
  data: (ProtocolStatsData | TVLMetricsData)[];
  isLoading?: boolean;
  type?: 'protocol' | 'asset';
  assetSymbol?: string;
  height?: number;
  showTitle?: boolean;
}

export const TVLChart = ({ 
  data, 
  isLoading, 
  type = 'protocol',
  assetSymbol,
  height = 300,
  showTitle = true 
}: TVLChartProps) => {
  const chartData = useMemo(() => {
    const processedData = data.map(item => ({
      timestamp: new Date(item.timestamp),
      tvl: type === 'protocol' 
        ? (item as ProtocolStatsData).globalMetrics.totalValueLocked.toNumber()
        : (item as TVLMetricsData).tvlUSD.toNumber(),
      staked: type === 'protocol'
        ? (item as ProtocolStatsData).globalMetrics.totalStaked.toNumber()
        : (item as TVLMetricsData).totalXassetsStakedUSD.toNumber()
    }));

    processedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      labels: processedData.map(d => {
        const date = new Date(d.timestamp);
        return date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
      }),
      datasets: [
        {
          label: 'Total Staked',
          data: processedData.map(d => d.staked),
          backgroundColor: '#9b4dff',
          stack: 'stack0',
        },
        {
          label: 'TVL',
          data: processedData.map(d => d.tvl),
          backgroundColor: '#6b2cf5',
          stack: 'stack0',
        }
      ]
    };
  }, [data, type]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `${context.dataset.label}: ${formatCurrency(value, 14, 2, 'USD')}`;
          },
          title: (items: any) => {
            return items[0].label;
          }
        }
      }
    },
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          callback: (value: any) => formatCurrency(value, 14, 0, 'USD'),
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      x: {
        stacked: true,
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 8,
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <Paper sx={{ 
      p: 2, 
      bgcolor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: 2,
    }}>
      {showTitle && (
        <Typography variant="h6" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.87)' }}>
          {type === 'protocol' 
            ? 'Protocol TVL & Staked' 
            : `${assetSymbol} TVL & Staked`}
        </Typography>
      )}
      {isLoading ? (
        <Box height={height} display="flex" alignItems="center" justifyContent="center">
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Loading chart data...
          </Typography>
        </Box>
      ) : (
        <Box height={height}>
          <Bar data={chartData} options={options} />
        </Box>
      )}
    </Paper>
  );
};