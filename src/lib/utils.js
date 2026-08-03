import React from 'react';
import { AVATAR_PALETTE } from './constants';

export const totalReactions = (reactions) =>
  Object.values(reactions || {}).reduce((a, b) => a + b, 0);

export const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const renderWithMentions = (text) => {
  if (!text) return text;
  return text.split(/(@\w+)/g).map((part, i) =>
    /^@\w+$/.test(part)
      ? React.createElement('span', { key: i, className: 'mention' }, part)
      : React.createElement(React.Fragment, { key: i }, part)
  );
};

export const colorForName = (name) => {
  const str = name || '?';
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};
