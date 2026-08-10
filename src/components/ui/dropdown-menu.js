import React from 'react';

export function DropdownMenu({ className = '', ...props }) {
  return <div className={['ui-dropdown-menu', className].filter(Boolean).join(' ')} {...props} />;
}

export function DropdownMenuItem({ className = '', ...props }) {
  return <button type="button" className={['ui-dropdown-item', className].filter(Boolean).join(' ')} {...props} />;
}
