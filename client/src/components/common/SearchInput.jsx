import { FiSearch } from 'react-icons/fi';

const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative group ${className}`}>
    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light group-focus-within:text-gold-dark transition-colors" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2.5 border border-line rounded-xl bg-white text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold outline-none transition placeholder:text-muted-light"
    />
  </div>
);

export default SearchInput;
