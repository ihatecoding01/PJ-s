import React from 'react';
import UiAddressChip from '../ui/AddressChip.jsx';

export default function AddressBadge({
  address: rawAddress,
  label,
  showExplorer = true,
  className = '',
}) {
  const address = typeof rawAddress === 'object' && rawAddress !== null
    ? (rawAddress.walletAddress || '')
    : (rawAddress || '');

  return (
    <UiAddressChip
      address={address}
      label={label}
      showExplorer={showExplorer}
      className={className}
    />
  );
}
