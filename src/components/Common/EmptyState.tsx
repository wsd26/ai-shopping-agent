interface EmptyStateProps {
  title: string
  description?: string
  icon?: string
}

export function EmptyState({ title, description, icon = '💬' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-white/80 text-base font-medium mb-1">{title}</h3>
      {description && <p className="text-white/40 text-sm">{description}</p>}
    </div>
  )
}