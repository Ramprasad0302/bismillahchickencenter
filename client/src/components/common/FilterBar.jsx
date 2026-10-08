import { FiFilter } from 'react-icons/fi';

const FilterBar = ({ 
  filters = [],
  activeFilter,
  onFilterChange,
  className = '' 
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <FiFilter className="w-4 h-4 text-muted" />
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            activeFilter === filter.value
              ? 'bg-brand text-white shadow-md'
              : 'bg-white border border-line text-muted hover:border-gold/40 hover:text-ink'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default FilterBar;