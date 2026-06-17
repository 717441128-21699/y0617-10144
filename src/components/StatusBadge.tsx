interface StatusBadgeProps {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

const variantClasses: Record<StatusBadgeProps['variant'], string> = {
  success: 'bg-accent-100 text-accent-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-critical-100 text-critical-700',
  info: 'bg-primary-100 text-primary-700',
  neutral: 'bg-gray-100 text-gray-700',
}

export default function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {label}
    </span>
  )
}
