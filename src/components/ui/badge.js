import React from 'react';

const badgeVariants = {
  neutral: 'ui-badge--default',
  default: 'ui-badge--default',
  secondary: 'ui-badge--secondary',
  success: 'ui-badge--success',
  warning: 'ui-badge--warning',
  danger: 'ui-badge--destructive',
  destructive: 'ui-badge--destructive',
  info: 'ui-badge--info',
  purple: 'ui-badge--purple',
};

export function Badge({ className = '', variant = 'default', ...props }) {
  return <span className={['ui-badge', badgeVariants[variant] || badgeVariants.default, className].filter(Boolean).join(' ')} {...props} />;
}
