# Spec Delta

## Purpose

Provide a stable Tailwind theme and locally served font faces to support the Kaizen UI v4 restyles across the signed-in screens, Login, and the not-found page.

## ADDED Requirements

### Requirement: Publish the approved shared web theme

The web app SHALL expose the full approved Stitch palette, type scale, and spacing through Tailwind v4, with the existing app tokens available during the transition. Named radii, the default radius, and the full radius SHALL resolve to zero. Shared semantic colour names SHALL keep their approved values across route scopes.

#### Scenario: A web component references the theme

- **WHEN** a component uses an agreed colour, type, spacing, or radius token
- **THEN** the token resolves to its documented value and named radius utilities produce square corners

### Requirement: Scope the archival fault palette

The web app SHALL make the five approved archival fault colours available only via the 404 theme scope, while exposing the same shared colours inside that scope.

#### Scenario: A 404 utility resolves its backing value

- **WHEN** a component inside the 404 theme scope uses an archival fault colour
- **THEN** it resolves to the approved 404 value without changing any shared colour or leaking that backing value outside the scope

### Requirement: Serve the approved typefaces with the web build

The web app SHALL load Space Grotesk at 300, 400, 600, and 700, DM Sans at 400, 500, and 700, and Space Mono at 400 and 700 through `next/font/google`. The production build SHALL serve those assets locally. The three new family-weight tokens SHALL resolve to 700. The theme SHALL preserve the existing Tailwind weight utilities and SHALL NOT introduce a screen-level weight override.

#### Scenario: A browser uses the heavy typography

- **WHEN** a component opts into an approved family-weight token
- **THEN** the browser uses the configured 700 face without relying on runtime Google Fonts or Tailwind CDN requests

### Requirement: Keep shared tokens free of motion

The design token layer SHALL introduce no animations. Restyles that introduce decorative motion from the exports SHALL guard it with `prefers-reduced-motion`.

#### Scenario: A restyle incorporates the 404 pulse

- **WHEN** the eventual 404 restyle incorporates the pulse from the reference
- **THEN** the status text remains visible without that animation when reduced motion is requested
