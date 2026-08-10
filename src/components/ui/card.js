import React from 'react';

export function Card({ className = '', as: Component = 'div', ...props }) {
  return <Component className={['ui-card', className].filter(Boolean).join(' ')} {...props} />;
}

export function CardHeader({ className = '', ...props }) {
  return <div className={['ui-card-header', className].filter(Boolean).join(' ')} {...props} />;
}

export function CardTitle({ className = '', children, ...props }) {
  return <h3 className={['ui-card-title', className].filter(Boolean).join(' ')} {...props}>{children}</h3>;
}

export function CardDescription({ className = '', children, ...props }) {
  return <p className={['ui-card-description', className].filter(Boolean).join(' ')} {...props}>{children}</p>;
}

export function CardContent({ className = '', children, ...props }) {
  return <div className={['ui-card-content', className].filter(Boolean).join(' ')} {...props}>{children}</div>;
}
