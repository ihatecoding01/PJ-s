import React from 'react';
import UiButton from '../ui/Button.jsx';

export default function Button({
  isLoading,
  loading,
  ...props
}) {
  return <UiButton loading={isLoading || loading} {...props} />;
}
