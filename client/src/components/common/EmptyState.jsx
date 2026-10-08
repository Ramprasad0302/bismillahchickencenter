const EmptyState = ({
  title = 'No data found',
  description = "Try adjusting your search or filter to find what you're looking for.",
  icon: Icon,
  action,
}) => (
  <div className="text-center py-14">
    {Icon && (
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold-soft border border-gold/20 flex items-center justify-center">
        <Icon className="w-7 h-7 text-gold-dark" />
      </div>
    )}
    <h3 className="font-display text-lg font-semibold text-ink mb-1.5">{title}</h3>
    <p className="text-sm text-muted max-w-md mx-auto">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
