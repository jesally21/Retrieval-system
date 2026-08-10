import React from 'react';

export function Separator({ className = '', ...props }) {
  return <div className={['ui-separator', className].filter(Boolean).join(' ')} {...props} />;
}
