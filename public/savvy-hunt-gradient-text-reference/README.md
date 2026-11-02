# Savvy Hunt — Mobile hero GradientText reference files

- `GradientText.jsx`: Unmodified JSX source extracted from the supplied React Bits instructions.
- `GradientText.css`: Unmodified CSS source extracted from the supplied React Bits instructions.
- `React-Bits-original-instructions.md`: Full original source, props table, and usage example.
- `mobile-hero-annotated.png`: Supplied mobile screenshot; red rectangle identifies the title only, not a design element.

Integration instructions:
- Target: `components/home/hero-section.tsx`, mobile title only.
- Preserve the *actual current heading font*, Cormorant Garamond. Do not switch to Fraunces for this targeted effect.
- Preserve typography, exact two-line layout, underline, position, image and other design aspects.
- Preserve all original props, variants, and event/animation lifecycle behavior when converting JSX to typed TSX.
- Respect reduced-motion; ensure the reduced-motion fallback is static and readable.
- Intended colors: `['#1f2a23','#32643b','#c59439','#32643b']`; `animationSpeed={8}`, `variant="flow"`, `glow={0.12}`, `scale={3}`, `showBorder={false}`.
- Do not add border styling from the red screenshot markup.
