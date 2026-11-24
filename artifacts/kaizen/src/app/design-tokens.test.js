import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const sharedColours = {
  background: '#141312',
  error: '#ffb4ab',
  'error-container': '#93000a',
  'inverse-on-surface': '#32302f',
  'inverse-primary': '#bc160c',
  'inverse-surface': '#e6e1df',
  'on-background': '#e6e1df',
  'on-error': '#690005',
  'on-error-container': '#ffdad6',
  'on-primary': '#690000',
  'on-primary-container': '#5c0000',
  'on-primary-fixed': '#410000',
  'on-primary-fixed-variant': '#930000',
  'on-secondary': '#32302a',
  'on-secondary-container': '#bcb8af',
  'on-secondary-fixed': '#1d1c16',
  'on-secondary-fixed-variant': '#494740',
  'on-surface': '#e6e1df',
  'on-surface-variant': '#e5bdb7',
  'on-tertiary': '#2d3400',
  'on-tertiary-container': '#262d00',
  'on-tertiary-fixed': '#191e00',
  'on-tertiary-fixed-variant': '#424b00',
  outline: '#ac8883',
  'outline-variant': '#5c403b',
  primary: '#ffb4a8',
  'primary-container': '#ff5541',
  'primary-fixed': '#ffdad4',
  'primary-fixed-dim': '#ffb4a8',
  secondary: '#cac6bd',
  'secondary-container': '#4b4942',
  'secondary-fixed': '#e7e2d8',
  'secondary-fixed-dim': '#cac6bd',
  surface: '#141312',
  'surface-bright': '#3b3937',
  'surface-container': '#211f1e',
  'surface-container-high': '#2b2a28',
  'surface-container-highest': '#363433',
  'surface-container-low': '#1d1b1a',
  'surface-container-lowest': '#0f0e0d',
  'surface-dim': '#141312',
  'surface-tint': '#ffb4a8',
  'surface-variant': '#363433',
  tertiary: '#c0ce71',
  'tertiary-container': '#8b9841',
  'tertiary-fixed': '#dceb8a',
  'tertiary-fixed-dim': '#c0ce71',
};

const spacing = {
  gutter: '0px',
  'gutter-desktop': '0px',
  margin: '1rem',
  'margin-desktop': '2rem',
  'margin-tablet': '1.5rem',
  'space-lg': '1.5rem',
  'space-md': '1rem',
  'space-sm': '0.5rem',
  'space-xl': '2.5rem',
  'space-xs': '0.25rem',
};

const typeScale = {
  'body-lg': ['16px', '24px', '0em', '400', 'sans'],
  'body-md': ['14px', '20px', '0em', '400', 'sans'],
  'body-sm': ['12px', '16px', '0.01em', '400', 'sans'],
  'display-lg': ['56px', '58px', '-0.03em', '700', 'grotesk'],
  'display-lg-mobile': ['36px', '38px', '-0.02em', '700', 'grotesk'],
  'display-xl': ['80px', '80px', '-0.04em', '700', 'grotesk'],
  'display-xl-mobile': ['44px', '44px', '-0.03em', '700', 'grotesk'],
  'headline-lg': ['32px', '36px', '-0.02em', '700', 'grotesk'],
  'headline-md': ['24px', '28px', '-0.01em', '700', 'grotesk'],
  'headline-sm': ['18px', '22px', '0em', '700', 'grotesk'],
  'label-mono-lg': ['14px', '18px', '0.05em', '700', 'mono'],
  'label-mono-md': ['12px', '16px', '0.06em', '400', 'mono'],
  'label-mono-sm': ['10px', '12px', '0.08em', '400', 'mono'],
};

const radiusTokens = [
  '--radius',
  '--radius-xs',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-2xl',
  '--radius-3xl',
  '--radius-4xl',
  '--radius-full',
];

const notFoundColours = {
  '404-surface-container': ['--kaizen-404-surface-container', '#242321'],
  '404-surface-container-high': [
    '--kaizen-404-surface-container-high',
    '#2f2e2b',
  ],
  '404-border-subtle': ['--kaizen-404-border-subtle', '#2a2826'],
  '404-border-strong': ['--kaizen-404-border-strong', '#3d3a36'],
  muted: ['--kaizen-404-muted', '#8a8580'],
};

/** @param {string} css */
function customProperties(css) {
  return Array.from(
    css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/g),
    ([, name, value]) => [name, value.trim()],
  );
}

it('defines the agreed Kaizen UI v4 theme tokens without 900-weight or rounded defaults', () => {
  const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');
  const theme = Object.fromEntries(
    Array.from(css.matchAll(/@theme\b[^{}]*\{([^{}]*)\}/g)).flatMap(
      ([, block]) => customProperties(block),
    ),
  );

  for (const [name, value] of Object.entries(sharedColours)) {
    expect(theme[`--color-${name}`]).toBe(value);
  }
  for (const [name, value] of Object.entries(spacing)) {
    expect(theme[`--spacing-${name}`]).toBe(value);
  }
  for (const [
    name,
    [size, lineHeight, tracking, weight, family],
  ] of Object.entries(typeScale)) {
    expect(theme[`--text-${name}`]).toBe(size);
    expect(theme[`--text-${name}--line-height`]).toBe(lineHeight);
    expect(theme[`--text-${name}--letter-spacing`]).toBe(tracking);
    expect(theme[`--text-${name}--font-weight`]).toBe(weight);
    expect(theme[`--font-${name}`]).toBe(`var(--font-kaizen-${family})`);
  }

  const radii = Object.entries(theme).filter(([name]) =>
    /^--radius(?:-|$)/.test(name),
  );
  expect(Object.fromEntries(radii)).toEqual(
    Object.fromEntries(radiusTokens.map((name) => [name, '0'])),
  );

  const familyWeights = Object.entries(theme).filter(([name]) =>
    name.startsWith('--font-weight-'),
  );
  expect(Object.fromEntries(familyWeights)).toEqual({
    '--font-weight-sans': '700',
    '--font-weight-grotesk': '700',
    '--font-weight-mono': '700',
  });

  const fonts = readFileSync(new URL('./fonts.css', import.meta.url), 'utf8');
  for (const [slug, name, token, weights] of [
    ['space-grotesk', 'Space Grotesk', 'grotesk', [300, 400, 600, 700]],
    ['dm-sans', 'DM Sans', 'sans', [400, 500, 700]],
    ['space-mono', 'Space Mono', 'mono', [400, 700]],
  ]) {
    expect(fonts).toContain(`--font-kaizen-${token}: '${name}'`);
    for (const weight of weights) {
      expect(fonts).toContain(`@fontsource/${slug}/latin-${weight}.css`);
    }
  }

  const scopes = Array.from(css.matchAll(/\.kaizen-404-theme\s*\{([^{}]*)\}/g));
  expect(scopes).toHaveLength(1);
  const [[scope, block]] = scopes;
  const scoped = Object.fromEntries(customProperties(block));
  const outside = customProperties(css.replace(scope, ''));
  for (const [name, [backing, value]] of Object.entries(notFoundColours)) {
    expect(theme[`--color-${name}`]).toBe(`var(${backing})`);
    expect(scoped[backing]).toBe(value);
    expect(outside.some(([property]) => property === backing)).toBe(false);
  }
});
