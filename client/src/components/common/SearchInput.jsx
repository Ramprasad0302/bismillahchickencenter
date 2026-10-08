import { FiSearch } from 'react-icons/fi';

const SearchInput = ({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  className = '' 
}) => {
  return (
    <div className={`relative ${className}`}>
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#949A96]" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-[#E5E8E6] rounded-lg bg-white focus:ring-2 focus:ring-[#111714] focus:border-transparent outline-none transition"
      />
    </div>
  );
};

export default SearchInput;