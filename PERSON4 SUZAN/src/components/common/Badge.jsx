import React from 'react';
import UiBadge from '../ui/Badge.jsx';

export default function Badge({
  label,
  children,
  variant,
  ...props
}) {
  return (
    <UiBadge status={variant || label || children} {...props}>
      {label || children}
    </UiBadge>
  );
}
