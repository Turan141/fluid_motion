# fluid-cursor

Published package: `@turan95/fluid-cursor`

A lightweight, futuristic cursor effect library for websites. `fluid-cursor` creates a liquid-feeling pointer with elastic follow motion, molten membrane blobs, soft glow, morphing scale, dissolving trails, and optional fake DOM physics around nearby elements.

## Install

```bash
npm install @turan95/fluid-cursor
```

## Usage

```ts
import { FluidCursor } from "@turan95/fluid-cursor"

const cursor = new FluidCursor({
	size: 24,
	color: "#00ffff",
	speed: 0.15,
	glow: true,
	trail: true,
	liquid: true,
	melt: true,
	physics: true,
	magnetism: 0.4,
	distortion: 0.2,
	trailLength: 12
})

// later
cursor.destroy()
```

No extra CSS import is required. The package injects its own minimal runtime stylesheet when the cursor is created.

## More Examples

```ts
import { FluidCursor } from "@turan95/fluid-cursor"

const cursor = new FluidCursor({
	color: "#6dff8b",
	size: 28,
	speed: 0.12,
	glow: true,
	trail: true,
	liquid: true,
	melt: true,
	physics: true,
	blendMode: "lighten",
	magnetism: 0.55,
	distortion: 0.32,
	trailLength: 18,
	trailCount: 18,
	trailLifetime: 640
})

window.addEventListener("beforeunload", () => {
	cursor.destroy()
})
```

```ts
import { FluidCursor } from "@turan95/fluid-cursor"

new FluidCursor({
	color: "#ff7a18",
	glow: false,
	trail: false,
	liquid: false,
	melt: false,
	physics: false,
	disableOnMobile: true
})
```

## Advanced Demo Setup

The built-in demo page includes `data-fluid-button`, `data-fluid-card`, and `data-fluid-text` markers so you can see the DOM physics illusion clearly. On your own pages, add those attributes to opt specific surfaces into the strongest reactions.

```html
<button data-fluid-button>Magnetic button</button>
<article data-fluid-card>Reactive card</article>
<h2 data-fluid-text>Charged headline</h2>
```

## API

| Option               | Type        | Default      | Description                                                             |
| -------------------- | ----------- | ------------ | ----------------------------------------------------------------------- |
| `size`               | `number`    | `24`         | Base cursor diameter in pixels.                                         |
| `color`              | `string`    | `#00ffff`    | Core cursor and trail color.                                            |
| `speed`              | `number`    | `0.15`       | Follow interpolation strength. Lower values feel slower and more fluid. |
| `glow`               | `boolean`   | `true`       | Enables the bloom layer behind the cursor core.                         |
| `trail`              | `boolean`   | `true`       | Enables pooled particle trail rendering.                                |
| `blendMode`          | `BlendMode` | `screen`     | CSS blend mode for the cursor layers.                                   |
| `disableOnMobile`    | `boolean`   | `true`       | Disables the effect on coarse pointers and touch-heavy devices.         |
| `zIndex`             | `number`    | `2147483646` | Stacking order for the cursor overlay.                                  |
| `trailCount`         | `number`    | `14`         | Number of pooled trail particles kept in the DOM.                       |
| `trailLifetime`      | `number`    | `520`        | Particle lifetime in milliseconds.                                      |
| `trailSpawnInterval` | `number`    | `18`         | Minimum time between particle spawns.                                   |
| `elasticity`         | `number`    | `0.18`       | Extra spring energy applied on follow updates.                          |
| `liquid`             | `boolean`   | `true`       | Enables membrane blobs, wobble, and stronger velocity-based morphing.   |
| `melt`               | `boolean`   | `true`       | Enables softer, more dissolving trail behavior and smear-like motion.   |
| `physics`            | `boolean`   | `false`      | Enables fake magnetic DOM interaction for buttons, cards, and text.     |
| `magnetism`          | `number`    | `0.4`        | Controls how strongly nearby elements react to the cursor field.        |
| `distortion`         | `number`    | `0.2`        | Controls card tilt and subtle text deformation around the cursor.       |
| `trailLength`        | `number`    | `12`         | Controls the pooled fluid trail length.                                 |

## Methods

| Method      | Description                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------- |
| `destroy()` | Cancels animation, removes DOM nodes, and unregisters listeners. Safe to call multiple times. |

## Demo

```bash
npm install
npm run dev
```

The included Vite demo page lets you preview presets, edit color, change size, tune speed, push magnetic distortion, and test buttons, cards, and text against the cursor field in real time.

## GIF Placeholder

Add a short capture here before publishing:

```md
![fluid-cursor demo](./assets/fluid-cursor-demo.gif)
```

## Performance Notes

- Uses a single `requestAnimationFrame` loop.
- Uses GPU-friendly `translate3d`, `scale`, and `rotate` transforms.
- Keeps DOM usage minimal with one overlay, one core, one membrane layer, three liquid satellites, one glow layer, and a pooled particle set.
- Applies DOM reactions with lightweight transform updates instead of a heavy physics engine.
- Automatically pauses when the tab is hidden or the window loses focus.
- Automatically skips initialization in SSR environments and on mobile when `disableOnMobile` is enabled.

## Browser Support

- Chrome / Edge 109+
- Safari 16+
- Firefox 109+

The package relies on modern DOM APIs, ES modules, and CSS blend modes.

## Build

```bash
npm run build
```

This emits:

- `dist/fluid-cursor.js`
- `dist/index.d.ts`
- `dist/fluid-cursor.css`
- demo assets and `dist/index.html`

## Publishing

```bash
npm publish --access public
```

The package is already configured with `files`, `exports`, and a `prepublishOnly` build step.
