import React from 'react';

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="ui-dialog-overlay" onMouseDown={() => onOpenChange?.(false)}>
      <div className="ui-dialog-content" onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className = '', ...props }) {
  return <div className={['ui-dialog-header', className].filter(Boolean).join(' ')} {...props} />;
}

export function DialogBody({ className = '', ...props }) {
  return <div className={['ui-dialog-body', className].filter(Boolean).join(' ')} {...props} />;
}

export function DialogFooter({ className = '', ...props }) {
  return <div className={['ui-dialog-footer', className].filter(Boolean).join(' ')} {...props} />;
}
