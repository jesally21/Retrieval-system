import React from 'react';

const buttonVariants = {
  default: 'ui-button--default',
  secondary: 'ui-button--secondary',
  ghost: 'ui-button--ghost',
  outline: 'ui-button--outline',
  destructive: 'ui-button--destructive',
};

const buttonSizes = {
  default: '',
  sm: 'ui-button--sm',
  lg: 'ui-button--lg',
};

export const Button = React.forwardRef(function Button(
  { className = '', variant = 'default', size = 'default', asChild = false, ...props },
  ref,
) {
  const nextProps = props.type ? props : { ...props, type: 'button' };
  const classes = ['ui-button', buttonVariants[variant] || buttonVariants.default, buttonSizes[size] || '', className]
    .filter(Boolean)
    .join(' ');

  if (asChild && React.isValidElement(props.children)) {
    return React.cloneElement(props.children, {
      ...props.children.props,
      className: [props.children.props.className, classes].filter(Boolean).join(' '),
      ref,
    });
  }

  return <button ref={ref} className={classes} {...nextProps} />;
});
