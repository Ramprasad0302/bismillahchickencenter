const EmptyState = ({ 
  title = 'No data found', 
  description = 'Try adjusting your search or filter to find what you\'re looking for.',
  icon: Icon,
  action
}) => {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="w-12 h-12 mx-auto text-[#949A96] mb-4" />}
      <h3 className="text-lg font-semibold text-[#151A17] mb-2">{title}</h3>
      <p className="text-sm text-[#6B716D] max-w-md mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;