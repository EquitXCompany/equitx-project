import { BarChart as MuiBarChart } from '@mui/x-charts';
import { Box } from '@mui/material';

interface ChartData {
  [key: string]: string | number;
  date: string;
  value: number;
  count: number;
}

interface AxisConfig {
  dataKey: string;
  scaleType: 'band' | 'linear' | 'log';
}

interface SeriesConfig {
  dataKey: string;
  label: string;
  valueFormatter: (value: number) => string;
  color: string;
}

interface BarChartProps {
  data: ChartData[];
  xAxis: AxisConfig;
  series: SeriesConfig[];
  height?: number;
}

export const BarChart = ({ 
  data, 
  xAxis, 
  series,
  height = 300 
}: BarChartProps) => {
  return (
    <Box height={height}>
      <MuiBarChart
        dataset={data}
        xAxis={[{
          ...xAxis,
          tickLabelStyle: {
            angle: 45,
            textAnchor: 'start',
            fill: 'rgba(255, 255, 255, 0.7)',
          },
        }]}
        yAxis={[{
          tickLabelStyle: {
            fill: 'rgba(255, 255, 255, 0.7)',
          },
        }]}
        series={series.map(s => ({
          ...s,
          type: 'bar' as const,
          stack: 'total', // Enable stacking
          valueFormatter: (value: number | null) => {
            if (value === null) return '';
            return s.valueFormatter(value);
          },
        }))}
        slotProps={{
          legend: {
            hidden: false,
            position: { vertical: 'top', horizontal: 'right' },
            labelStyle: {
              fill: 'rgba(255, 255, 255, 0.7)',
            },
          },
        }}
        tooltip={{
          trigger: 'item',
        }}
        height={height}
        margin={{
          left: 60,
          right: 20,
          top: 20,
          bottom: 60,
        }}
        sx={{
          '.MuiChartsAxis-line, .MuiChartsAxis-tick': {
            stroke: 'rgba(255, 255, 255, 0.2)',
          },
          '.MuiChartsAxis-grid': {
            stroke: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </Box>
  );
};