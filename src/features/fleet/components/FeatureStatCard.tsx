import type { LucideIcon } from 'lucide-react';

type FeatureStatCardProps = {
  value: number;
  label: string;
  icon: LucideIcon;
  accentBarClassName: string;
  iconWrapperClassName: string;
  iconClassName: string;
  valueClassName?: string;
};

export default function FeatureStatCard({
  value,
  label,
  icon: Icon,
  accentBarClassName,
  iconWrapperClassName,
  iconClassName,
  valueClassName,
}: FeatureStatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md">
      <div className={`absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl ${accentBarClassName}`} />
      <div className="ml-2 flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${iconWrapperClassName}`}>
          <Icon className={`h-6 w-6 ${iconClassName}`} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${valueClassName || 'text-gray-900'}`}>{value}</p>
          <p className="text-xs font-medium text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
