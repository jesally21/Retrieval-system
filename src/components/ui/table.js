import React from 'react';

export function Table({ className = '', ...props }) {
  return <table className={['ui-table', className].filter(Boolean).join(' ')} {...props} />;
}

export function TableHeader({ className = '', ...props }) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className = '', ...props }) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className = '', ...props }) {
  return <tr className={className} {...props} />;
}

export function TableHead({ className = '', ...props }) {
  return <th className={className} {...props} />;
}

export function TableCell({ className = '', ...props }) {
  return <td className={className} {...props} />;
}
