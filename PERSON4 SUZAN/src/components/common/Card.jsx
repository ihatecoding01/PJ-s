import React from 'react';
import UiCard from '../ui/Card.jsx';

export default function Card({ hoverEffect, ...props }) {
  return <UiCard {...props} />;
}
