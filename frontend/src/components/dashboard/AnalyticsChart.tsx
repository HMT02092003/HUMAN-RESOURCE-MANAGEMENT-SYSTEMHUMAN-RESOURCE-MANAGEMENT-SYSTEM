"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

interface ChartDataPoint {
  name: string;
  [key: string]: any;
}

interface AnalyticsChartProps {
  data: ChartDataPoint[];
  title?: string;
  type?: 'area' | 'bar' | 'line';
  dataKeys?: string[];
  colors?: string[];
}

export const AnalyticsChart = ({
  data,
  title = 'Biểu đồ phân tích',
  type = 'area',
  dataKeys = ['value'],
  colors = ['#3b82f6', '#10b981', '#f59e0b']
}: AnalyticsChartProps) => {
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>(type);

  const labels = useMemo(() => data.map(d => d.name), [data]);

  const datasets = useMemo(() => {
    return dataKeys.map((key, idx) => ({
      label: key,
      data: data.map(d => (typeof d[key] === 'number' ? d[key] : 0)),
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length] + '33',
      fill: chartType === 'area',
      tension: 0.3,
    }));
  }, [data, dataKeys, colors, chartType]);

  const commonOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: !!title, text: title },
    },
  };

  const lineData = { labels, datasets };
  const barData = { labels, datasets };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <div className="flex gap-2">
          <button onClick={() => setChartType('area')} className={`px-3 py-1 rounded-lg text-sm font-medium ${chartType === 'area' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Area</button>
          <button onClick={() => setChartType('bar')} className={`px-3 py-1 rounded-lg text-sm font-medium ${chartType === 'bar' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Bar</button>
          <button onClick={() => setChartType('line')} className={`px-3 py-1 rounded-lg text-sm font-medium ${chartType === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>Line</button>
        </div>
      </div>

      <div className="h-[360px]">
        {chartType === 'bar' ? (
          <Bar options={commonOptions} data={barData} />
        ) : (
          <Line options={commonOptions} data={lineData} />
        )}
      </div>
    </motion.div>
  );
};
