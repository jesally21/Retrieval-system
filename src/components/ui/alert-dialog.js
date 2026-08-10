import React from 'react';

export function AlertDialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="ui-alert-dialog-overlay" onMouseDown={() => onOpenChange?.(false)}>
      <div className="ui-alert-dialog-content" onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ className = '', ...props }) {
  return <div className={['ui-alert-dialog-header', className].filter(Boolean).join(' ')} {...props} />;
}

export function AlertDialogBody({ className = '', ...props }) {
  return <div className={['ui-alert-dialog-body', className].filter(Boolean).join(' ')} {...props} />;
}

export function AlertDialogFooter({ className = '', ...props }) {
  return <div className={['ui-alert-dialog-footer', className].filter(Boolean).join(' ')} {...props} />;
}
