import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'maintenance';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const baseClasses = size === 'sm' 
    ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    : 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';

  const statusClasses = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    maintenance: 'bg-yellow-100 text-yellow-800'
  };

  const statusText = {
    active: 'Active',
    inactive: 'Inactive',
    maintenance: 'Maintenance'
  };

  return (
    <span className={`${baseClasses} ${statusClasses[status]}`}>
      {statusText[status]}
    </span>
  );
};