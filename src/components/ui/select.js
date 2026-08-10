import React from 'react';

export const Select = React.forwardRef(function Select({ className = '', children, ...props }, ref) {
  return <select ref={ref} className={['ui-select', className].filter(Boolean).join(' ')} {...props}>{children}</select>;
});
