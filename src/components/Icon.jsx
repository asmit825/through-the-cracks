import React from 'react';
import { ICONS } from './icon-names';

const SIZE_CLASS = {
  sm: 'icon-sm',   // 16px
  md: '',          // 20px — system default
  lg: 'icon-lg',   // 24px
};

/**
 * Google Material Symbols (Rounded) — the design system's only sanctioned
 * icon library (05.Minimal-Dark/07.Effects-Animation.md).
 *
 * Icons are decorative by default; the adjacent text carries the meaning. Pass
 * a `title` only when the icon genuinely stands alone.
 */
export default function Icon({ name, size = 'md', accent = false, className = '', ...rest }) {
  if (import.meta.env.DEV && !ICONS.includes(name)) {
    console.warn(
      `[Icon] "${name}" is not in the subset — add it to src/components/icon-names.js ` +
      `and to the icon_names list in index.html, or the full 1.2MB font will be fetched.`
    );
  }

  const classes = [
    'material-symbols-rounded',
    SIZE_CLASS[size] || '',
    accent ? 'icon-accent' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} aria-hidden="true" {...rest}>
      {name}
    </span>
  );
}
