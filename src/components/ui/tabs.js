import React from 'react';

export function Tabs({ className = '', ...props }) {
  return <div className={['ui-tabs', className].filter(Boolean).join(' ')} {...props} />;
}

export function TabsList({ className = '', ...props }) {
  return <div className={['ui-tabs-list', className].filter(Boolean).join(' ')} {...props} />;
}

export function TabsTrigger({ className = '', active = false, ...props }) {
  return <button type="button" data-state={active ? 'active' : 'inactive'} className={['ui-tabs-trigger', className].filter(Boolean).join(' ')} {...props} />;
}
