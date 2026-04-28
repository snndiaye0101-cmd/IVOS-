import type { LucideIcon } from 'lucide-react'

type FeatureStatCardProps = {
  value: number
  label: string
  icon: LucideIcon
  accentBarClassName: string
  iconWrapperClassName: string
  iconClassName: string
  valueClassName?: string
}

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
    <div className="bg-white shadow-md rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${accentBarClassName}`} />
      <div className="flex items-center gap-3 ml-2">
        <div className={`p-2.5 rounded-xl ${iconWrapperClassName}`}>
          <Icon className={`h-6 w-6 ${iconClassName}`} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${valueClassName || 'text-gray-900'}`}>{value}</p>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
        </div>
      </div>
    </div>
  )
}
