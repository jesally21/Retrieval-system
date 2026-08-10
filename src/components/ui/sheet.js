import React from 'react';

export function Sheet({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="ui-sheet-overlay" onMouseDown={() => onOpenChange?.(false)}>
      <div className="ui-sheet-content" onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className = '', ...props }) {
  return <div className={['ui-sheet-header', className].filter(Boolean).join(' ')} {...props} />;
}

export function SheetBody({ className = '', ...props }) {
  return <div className={['ui-sheet-body', className].filter(Boolean).join(' ')} {...props} />;
}

export function SheetFooter({ className = '', ...props }) {
  return <div className={['ui-sheet-footer', className].filter(Boolean).join(' ')} {...props} />;
}
