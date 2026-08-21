// Validated categorical palette (light mode) — colorblind-safe adjacent pairs,
// fixed hue order. See the dataviz skill's references/palette.md.
export const CATEGORICAL_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
];

// Stable color per entity: pass a fixed, rank-independent ordering (e.g. all
// player ids sorted alphabetically by name) so a color never repaints when a
// filter changes which entities are visible.
export function colorForIndex(index) {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}

export function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
