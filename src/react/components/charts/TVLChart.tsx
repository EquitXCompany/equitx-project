import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Paper, Typography } from '@mui/material';
import { formatCurrency } from '../../../utils/formatters';
import { ProtocolStatsData, TVLMetricsData } from '../../hooks/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
    console.log(data[0]?.timestamp);
    const processedData = data.map(item => ({
      timestamp: new Date(item.timestamp),
      value: type === 'protocol' 
        ? (item as ProtocolStatsData).globalMetrics.totalValueLocked.toNumber()
        : (item as TVLMetricsData).tvlUSD.toNumber()
    }));

    // Sort by timestamp
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
          label: type === 'protocol' 
            ? 'Total Value Locked' 
            : `${assetSymbol} TVL`,
          data: processedData.map(d => d.value),
          borderColor: '#6b2cf5', // Purple color matching the theme
          backgroundColor: 'rgba(107, 44, 245, 0.1)',
          fill: true,
          tension: 0.4, // Smooth curves
          pointRadius: 0, // Hide points
          pointHoverRadius: 4, // Show points on hover
        }
      ]
    };
  }, [data, type, assetSymbol]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `TVL: ${formatCurrency(value, 2, 'USD')}`;
          },
          title: (items: any) => {
            return items[0].label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          callback: (value: any) => formatCurrency(value, 0, 'USD'),
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      x: {
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
            ? 'Protocol TVL' 
            : `${assetSymbol} TVL`}
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
          <Line data={chartData} options={options} />
        </Box>
      )}
    </Paper>
  );
};
