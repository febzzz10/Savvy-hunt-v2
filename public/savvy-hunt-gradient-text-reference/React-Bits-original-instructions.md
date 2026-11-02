## Integrate the <GradientText /> component from React Bits

You are helping integrate an open-source React component into an existing application.

### Component: GradientText
### Variant: JavaScript + CSS


---

### Usage Example
```jsx
import GradientText from './GradientText';

<GradientText
  colors={["#207321","#ffffff","#07670b"]}
  animationSpeed={8}
  variant="flow"
  glow={0.6}
>
  Add a splash of color!
</GradientText>
```

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | The text to fill with the gradient. |
| colors | string[] | ["#5227FF", "#FF9FFC", "#B497CF"] | Colors of the gradient, in order. The first color is repeated at the end so loops stay seamless. |
| animationSpeed | number | 8 | Seconds for one full cycle of the animation. |
| variant | 'linear' | 'flow' | 'conic' | 'linear' | How the colors move. Linear slides a gradient through the text, flow drifts soft blobs of color around like a living mesh gradient and conic swings colors around the center. |
| angle | number | 90 | Direction of the gradient in degrees. 90 runs left to right, 180 top to bottom. |
| scale | number | 3 | How broad the colors are. Higher values show fewer colors at once in longer, calmer bands. |
| yoyo | boolean | true | Eases back and forth instead of scrolling the gradient in one direction forever. |
| glow | number | 0 | A soft bloom of the gradient colors around the letters, from 0 to 1. |
| showBorder | boolean | false | Wraps the text in a pill with an animated gradient outline that works on any background. |
| borderWidth | number | 1.5 | Thickness of the outline in px. |
| pauseOnHover | boolean | false | Holds the colors still while the pointer is over the text. |
| followPointer | boolean | false | While hovered, the colors are drawn toward the pointer. |
| className | string | '' | Extra class names for the root element. |
| style | CSSProperties | - | Inline styles for the root element. |

### Full Component Source
```jsx
'use client';

import { useEffect, useRef } from 'react';

import './GradientText.css';

const VARIANTS = ['linear', 'flow', 'conic'];
const ANGLES = { horizontal: 90, vertical: 180, diagonal: 135 };
const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function GradientText({
  children,
  colors = ['#5227FF', '#FF9FFC', '#B497CF'],
  animationSpeed = 8,
  variant = 'linear',
  angle = 90,
  direction,
  scale = 3,
  yoyo = true,
  glow = 0,
  showBorder = false,
  borderWidth = 1.5,
  pauseOnHover = false,
  followPointer = false,
  className = '',
  style
}) {
  const rootRef = useRef(null);
  const settingsRef = useRef(null);
  const wakeRef = useRef(null);
  const palette = colors.length > 1 ? colors : [colors[0] ?? '#ffffff', colors[0] ?? '#ffffff'];

  settingsRef.current = {
    colors: palette,
    speed: Math.max(0.2, animationSpeed),
    variant: VARIANTS.includes(variant) ? variant : 'linear',
    angle: direction ? (ANGLES[direction] ?? angle) : angle,
    scale: clamp(scale, 1, 6),
    yoyo,
    pauseOnHover,
    followPointer
  };

  useEffect(() => {
    wakeRef.current?.();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const state = { time: 0, inside: false, visible: true, x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0, pull: 0 };
    let raf = 0;
    let last = 0;
    let alive = true;

    const paint = () => {
      const s = settingsRef.current;
      const list = s.colors;
      const cycle = state.time / s.speed;
      let image;
      if (s.variant === 'flow') {
        const blobs = list.map((color, i) => {
          const spin = cycle * TAU;
          const rate = 0.55 + ((i * 0.618) % 1) * 0.5;
          let x = 50 + 44 * Math.sin(spin * rate + i * 2.1);
          let y = 50 + 40 * Math.sin(spin * (rate * 0.83 + 0.21) + i * 1.3);
          if (i === 0) {
            x += (state.px * 100 - x) * state.pull;
            y += (state.py * 100 - y) * state.pull;
          }
          return `radial-gradient(ellipse ${(22 + 12 * s.scale).toFixed(1)}% ${(60 + 30 * s.scale).toFixed(1)}% at ${x.toFixed(2)}% ${y.toFixed(2)}%, ${color} 0%, transparent 100%)`;
        });
        image = `${blobs.join(', ')}, linear-gradient(${s.angle}deg, ${list.join(', ')})`;
      } else if (s.variant === 'conic') {
        const sway = s.yoyo ? Math.sin(cycle * Math.PI) * 50 : cycle * 360;
        const cx = 50 + (state.px * 100 - 50) * state.pull;
        const cy = 260 + (state.py * 100 - 260) * state.pull;
        image = `repeating-conic-gradient(from ${(sway - 30).toFixed(2)}deg at ${cx.toFixed(2)}% ${cy.toFixed(2)}%, ${[...list, list[0]].map((color, i) => `${color} ${((i / list.length) * 60 * (3 / s.scale)).toFixed(2)}deg`).join(', ')})`;
      } else {
        const loop = [...list, list[0]];
        const period = 100 * s.scale;
        let offset;
        if (s.yoyo) {
          const swing = cycle % 2;
          const t = swing < 1 ? swing : 2 - swing;
          offset = (0.5 - Math.cos(Math.PI * t) / 2) * (period - 100);
        } else {
          offset = (cycle % 1) * period;
        }
        offset += (state.px - 0.5) * period * 0.5 * state.pull;
        const stops = loop.map((color, i) => `${color} ${((i / (loop.length - 1)) * period - offset).toFixed(2)}%`);
        image = `repeating-linear-gradient(${s.angle}deg, ${stops.join(', ')})`;
      }
      root.style.setProperty('--gt-gradient', image);
    };

    const tick = now => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const paused = reduce || (s.pauseOnHover && state.inside);
      if (!paused) state.time += dt;
      const target = s.followPointer && state.inside ? 1 : 0;
      state.pull += (target - state.pull) * (1 - Math.exp(-dt * 6));
      const stiffness = 160;
      state.vx += ((state.x - state.px) * stiffness - state.vx * 2 * Math.sqrt(stiffness)) * dt;
      state.vy += ((state.y - state.py) * stiffness - state.vy * 2 * Math.sqrt(stiffness)) * dt;
      state.px += state.vx * dt;
      state.py += state.vy * dt;
      paint();
      const settling = Math.abs(state.pull - target) > 0.001 || Math.abs(state.vx) + Math.abs(state.vy) > 0.001;
      if (!state.visible || (paused && !settling)) return;
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current = () => {
      paint();
      wake();
    };

    const locate = event => {
      const rect = root.getBoundingClientRect();
      state.x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      state.y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    };
    const onEnter = event => {
      locate(event);
      if (!state.inside) {
        state.px = state.x;
        state.py = state.y;
      }
      state.inside = true;
      wake();
    };
    const onMove = event => {
      locate(event);
      wake();
    };
    const onLeave = () => {
      state.inside = false;
      wake();
    };

    const observer = new IntersectionObserver(entries => {
      state.visible = entries.some(entry => entry.isIntersecting);
      if (state.visible) wake();
    });
    observer.observe(root);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    paint();
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      wakeRef.current = null;
    };
  }, []);

  const loop = [...palette, palette[0]];

  return (
    <span
      ref={rootRef}
      className={`gradient-text${showBorder ? ' gradient-text--border' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--gt-gradient': `linear-gradient(${direction ? (ANGLES[direction] ?? angle) : angle}deg, ${loop.join(', ')})`,
        '--gt-border': `${borderWidth}px`,
        '--gt-glow': clamp(glow, 0, 1),
        ...style
      }}
    >
      <span className="gradient-text__inner">
        <span className="gradient-text__content">{children}</span>
        {glow > 0 ? (
          <span className="gradient-text__glow" aria-hidden="true">
            {children}
          </span>
        ) : null}
      </span>
    </span>
  );
}

```

### Component CSS
```css
.gradient-text {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  isolation: isolate;
}

.gradient-text--border {
  padding: 0.35em 0.75em;
  border-radius: 999px;
}

.gradient-text--border::before {
  content: '';
  position: absolute;
  inset: 0;
  padding: var(--gt-border);
  border-radius: inherit;
  background-image: var(--gt-gradient);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box exclude,
    linear-gradient(#000 0 0);
  pointer-events: none;
}

.gradient-text__inner {
  position: relative;
  display: inline-block;
}

.gradient-text__content {
  display: inline-block;
  background-image: var(--gt-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.gradient-text__glow {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: var(--gt-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: blur(0.3em) saturate(1.4);
  opacity: var(--gt-glow);
  pointer-events: none;
  user-select: none;
}

```

### Integration Instructions
1. Install any listed dependencies.
2. Copy the component source into the appropriate directory in the project.
3. Import the CSS file alongside the component.
4. Import and render the component using the usage example above as a starting point.
5. Adjust props as needed for the specific use case — refer to the props table for all available options.

### More from React Bits
The full library index, including everything reactbits.dev offers, is at https://reactbits.dev/llms.txt — fetch it if this component is not the right fit or the project needs more pieces.
