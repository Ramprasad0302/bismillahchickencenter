import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'increase',
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E8E6] p-6 hover:shadow-md transition ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#6B716D]">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-[#151A17]">{value}</p>
        </div>
        {Icon && (
          <div className="p-3 bg-[#F6F7F6] rounded-lg">
            <Icon className="w-5 h-5 text-[#111714]" />
          </div>
        )}
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-sm font-medium ${
            changeType === 'increase' ? 'text-[#16834B]' : 'text-[#D14343]'
          }`}>
            {changeType === 'increase' ? <FiArrowUp className="inline w-3 h-3 mr-1" /> : <FiArrowDown className="inline w-3 h-3 mr-1" />}
            {change}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;