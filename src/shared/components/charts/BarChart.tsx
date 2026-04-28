/**
 * Composant BarChart — Graphique en Barres
 * Affiche l'évolution dans le temps
 */

import { useEffect, useRef } from 'react';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  width?: number;
  height?: number;
  unit?: string;
}

export default function BarChart({ 
  data, 
  title, 
  width = 800, 
  height = 400,
  unit = 't'
}: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    // Padding
    const paddingTop = 40;
    const paddingBottom = 60;
    const paddingLeft = 60;
    const paddingRight = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value
    const maxValue = Math.max(...data.map(d => d.value));
    const roundedMax = Math.ceil(maxValue / 1000) * 1000; // Round to nearest 1000

    // Draw Y-axis grid lines
    const gridLines = 5;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartWidth, y);
      ctx.stroke();

      // Y-axis labels
      const value = roundedMax - (roundedMax / gridLines) * i;
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatValue(value), paddingLeft - 10, y);
    }

    // Draw bars
    const barWidth = chartWidth / data.length;
    const barPadding = barWidth * 0.2;
    const actualBarWidth = barWidth - barPadding;

    data.forEach((item, index) => {
      const barHeight = (item.value / roundedMax) * chartHeight;
      const x = paddingLeft + index * barWidth + barPadding / 2;
      const y = paddingTop + chartHeight - barHeight;

      // Bar gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, item.color || '#10b981');
      gradient.addColorStop(1, item.color ? adjustBrightness(item.color, -30) : '#059669');

      // Draw bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, actualBarWidth, barHeight);

      // Draw bar border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, actualBarWidth, barHeight);

      // Value on top of bar
      if (barHeight > 30) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatValue(item.value), x + actualBarWidth / 2, y - 5);
      }

      // X-axis label
      ctx.fillStyle = '#374151';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // Multi-line label if too long
      const words = item.label.split(' ');
      if (words.length > 1) {
        ctx.fillText(words[0], x + actualBarWidth / 2, paddingTop + chartHeight + 10);
        ctx.fillText(words.slice(1).join(' '), x + actualBarWidth / 2, paddingTop + chartHeight + 25);
      } else {
        ctx.fillText(item.label, x + actualBarWidth / 2, paddingTop + chartHeight + 10);
      }
    });

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + chartHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop + chartHeight);
    ctx.lineTo(paddingLeft + chartWidth, paddingTop + chartHeight);
    ctx.stroke();

  }, [data, width, height]);

  const formatValue = (value: number) => {
    const tonnes = value / 1000;
    if (tonnes >= 1000) return `${(tonnes / 1000).toFixed(1)}k${unit}`;
    if (tonnes >= 100) return `${Math.round(tonnes)}${unit}`;
    if (tonnes >= 10) return `${tonnes.toFixed(1)}${unit}`;
    return `${tonnes.toFixed(2)}${unit}`;
  };

  const adjustBrightness = (color: string, amount: number): string => {
    // Simple brightness adjustment for hex colors
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <>
      <div className="flex flex-col items-center">
        {title && (
          <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
        )}

        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-200 rounded-lg"
        />
      </div>
    </>
  );
}
