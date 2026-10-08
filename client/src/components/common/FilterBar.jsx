import { FiFilter } from 'react-icons/fi';

const FilterBar = ({ 
  filters = [],
  activeFilter,
  onFilterChange,
  className = '' 
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <FiFilter className="w-4 h-4 text-[#6B716D]" />
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            activeFilter === filter.value
              ? 'bg-[#111714] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default FilterBar;