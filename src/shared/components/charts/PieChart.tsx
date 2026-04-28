/**
 * Composant PieChart — Graphique Camembert
 * Affiche la répartition en pourcentages
 */

import { useEffect, useRef } from 'react';

interface PieChartData {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  size?: number;
  showLegend?: boolean;
}

export default function PieChart({ data, title, size = 300, showLegend = true }: PieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 40;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    let currentAngle = -Math.PI / 2; // Start at top

    // Draw slices
    data.forEach((item) => {
      const sliceAngle = (item.percentage / 100) * 2 * Math.PI;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw percentage label (if > 5%)
      if (item.percentage > 5) {
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + (radius * 0.7) * Math.cos(labelAngle);
        const labelY = centerY + (radius * 0.7) * Math.sin(labelAngle);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(item.percentage)}%`, labelX, labelY);
      }

      currentAngle += sliceAngle;
    });

    // Draw center circle (donut effect)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Draw total in center
    const total = data.reduce((sum, item) => sum + item.value, 0);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', centerX, centerY - 12);
    
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText(formatValue(total), centerX, centerY + 18);

  }, [data, size]);

  const formatValue = (value: number) => {
    const tonnes = value / 1000;
    if (tonnes >= 1000) return `${(tonnes / 1000).toFixed(1)}kt`;
    if (tonnes >= 100) return `${Math.round(tonnes)}t`;
    if (tonnes >= 10) return `${tonnes.toFixed(1)}t`;
    return `${tonnes.toFixed(2)}t`;
  };

  return (
    <>
      <div className="flex flex-col items-center">
        {title && (
          <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
        )}

        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="mb-4"
        />

        {showLegend && (
          <div className="w-full space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {formatValue(item.value)}
                    </span>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
