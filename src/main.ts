import "./demo.css"
import { FluidCursor, type FluidCursorOptions } from "./index"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
	throw new Error("Demo root element was not found.")
}

const demoRoot = app

const presets = {
	aqua: {
		label: "Alien Aqua",
		description: "Glass-plasma orb with long melt wake and balanced repulsion.",
		blendMode: "screen",
		color: "#00f0ff",
		distortion: 0.22,
		magnetism: 0.42,
		size: 24,
		speed: 0.16
	},
	plasma: {
		label: "Chrome Plasma",
		description: "Broader liquid core with stronger card tilt and heavier magnetic pull.",
		blendMode: "lighten",
		color: "#6dff8b",
		distortion: 0.34,
		magnetism: 0.56,
		size: 28,
		speed: 0.14
	},
	ember: {
		label: "Molten Ember",
		description: "Aggressive morphing and a hotter, faster trail for showcase clips.",
		blendMode: "plus-lighter",
		color: "#ff7a18",
		distortion: 0.28,
		magnetism: 0.36,
		size: 22,
		speed: 0.18
	}
} as const satisfies Record<
	string,
	Pick<
		FluidCursorOptions,
		"blendMode" | "color" | "distortion" | "magnetism" | "size" | "speed"
	> & {
		description: string
		label: string
	}
>

type DemoState = Required<
	Pick<
		FluidCursorOptions,
		| "blendMode"
		| "color"
		| "distortion"
		| "glow"
		| "liquid"
		| "magnetism"
		| "melt"
		| "physics"
		| "size"
		| "speed"
		| "trail"
		| "trailLength"
	>
>

const state: DemoState = {
	blendMode: presets.aqua.blendMode,
	color: presets.aqua.color,
	distortion: presets.aqua.distortion,
	glow: true,
	liquid: true,
	magnetism: presets.aqua.magnetism,
	melt: true,
	physics: true,
	size: presets.aqua.size,
	speed: presets.aqua.speed,
	trail: true,
	trailLength: 12
}

let activePreset: keyof typeof presets = "aqua"
let cursor: FluidCursor | null = null

function render() {
	const preset = presets[activePreset]

	demoRoot.innerHTML = `
    <div class="page-shell">
      <div class="ambient ambient-a"></div>
      <div class="ambient ambient-b"></div>
      <div class="ambient ambient-c"></div>

      <section class="hero-panel">
        <div class="hero-copy">
          <p class="eyebrow" data-fluid-text>fluid-cursor</p>
          <h1 data-fluid-text>Impossible liquid motion for real DOM.</h1>
          <p class="lede" data-fluid-text>
            A cursor package built to feel alive: it stretches, melts, blooms, and bends nearby UI without a heavy physics engine.
            The effect is tuned for viral demos, premium landings, and over-the-top cyberpunk interfaces.
          </p>

          <div class="cta-row">
            <a class="button button-primary" href="#controls" data-fluid-button>Enter the lab</a>
            <button class="button button-secondary" type="button" data-scroll-showcase data-fluid-button>Trigger the reactor</button>
          </div>

          <div class="feature-grid">
            <div class="feature-card" data-fluid-card>
              <span>01</span>
              <strong>Liquid morphology</strong>
              <p>Velocity-based stretching, wobble, membrane lag, and chromed satellites.</p>
            </div>
            <div class="feature-card" data-fluid-card>
              <span>02</span>
              <strong>Melting trails</strong>
              <p>Blurred droplets dissolve behind the cursor and keep a luminous wake in motion.</p>
            </div>
            <div class="feature-card" data-fluid-card>
              <span>03</span>
              <strong>DOM illusions</strong>
              <p>Buttons repel, cards tilt, and typography subtly sways around the pointer field.</p>
            </div>
          </div>
        </div>

        <div class="showcase-panel reactor-panel" id="reactor">
          <div class="showcase-ring"></div>
          <div class="reactor-status" data-fluid-card>
            <div>
              <span class="status-label">Live preset</span>
              <strong>${preset.label}</strong>
            </div>
            <p>${preset.description}</p>
          </div>

          <div class="reactor-stage">
            <div class="reactor-grid"></div>
            <div class="reactor-orbit orbit-a"></div>
            <div class="reactor-orbit orbit-b"></div>
            <article class="reactor-card reactor-card-primary" data-fluid-card>
              <p class="card-kicker" data-fluid-text>Physics Card</p>
              <h3 data-fluid-text>Hover the cursor through this chamber.</h3>
              <p data-fluid-text>It should feel like the interface is half magnetic, half molten glass.</p>
              <button type="button" class="reactor-button" data-fluid-button>Launch pulse</button>
            </article>
            <article class="reactor-card reactor-card-secondary" data-fluid-card>
              <p class="card-kicker" data-fluid-text>Reactive Text</p>
              <h3 data-fluid-text>Headings should sway, not just sit there.</h3>
              <p data-fluid-text>Magnetism and distortion make typography feel electrically charged.</p>
              <div class="chip-row">
                <button type="button" class="micro-chip" data-fluid-button>ghost button</button>
                <button type="button" class="micro-chip" data-fluid-button>tilt card</button>
              </div>
            </article>
          </div>

          <div class="code-card" data-fluid-card>
            <div class="code-header">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <pre><code id="code-preview"></code></pre>
          </div>

          <div class="stat-strip">
            <div data-fluid-card>
              <strong>60fps</strong>
              <span>rAF + pooled particles</span>
            </div>
            <div data-fluid-card>
              <strong>GPU only</strong>
              <span>translate3d, scale, rotate</span>
            </div>
            <div data-fluid-card>
              <strong>DOM illusion</strong>
              <span>magnetism without a physics engine</span>
            </div>
          </div>
        </div>
      </section>

      <section class="control-panel" id="controls">
        <div class="panel-head">
          <p class="eyebrow" data-fluid-text>Preset Lab</p>
          <h2 data-fluid-text>Dial in the organism.</h2>
          <p data-fluid-text>Push magnetism, stretch the trail, and decide how much the cursor should disturb the page around it.</p>
        </div>

        <div class="controls-shell">
          <div class="preset-row">
            ${Object.entries(presets)
							.map(
								([key, entry]) => `
                  <button class="preset-chip${activePreset === key ? " is-active" : ""}" type="button" data-preset="${key}" data-fluid-button>
                    <span class="preset-swatch" style="--swatch:${entry.color}"></span>
                    <span>
                      <strong>${entry.label}</strong>
                      <small>${entry.description}</small>
                    </span>
                  </button>
                `
							)
							.join("")}
          </div>

          <div class="controls-layout">
            <div class="slider-grid">
              <label class="control-card" data-fluid-card>
                <span>Size</span>
                <strong>${state.size}px</strong>
                <input id="size" type="range" min="12" max="42" step="1" value="${state.size}" />
              </label>
              <label class="control-card" data-fluid-card>
                <span>Speed</span>
                <strong>${state.speed.toFixed(2)}</strong>
                <input id="speed" type="range" min="0.08" max="0.28" step="0.01" value="${state.speed}" />
              </label>
              <label class="control-card color-card" data-fluid-card>
                <span>Color</span>
                <strong>${state.color}</strong>
                <input id="color" type="color" value="${state.color}" />
              </label>
              <label class="control-card" data-fluid-card>
                <span>Magnetism</span>
                <strong>${state.magnetism.toFixed(2)}</strong>
                <input id="magnetism" type="range" min="0" max="1" step="0.01" value="${state.magnetism}" />
              </label>
              <label class="control-card" data-fluid-card>
                <span>Distortion</span>
                <strong>${state.distortion.toFixed(2)}</strong>
                <input id="distortion" type="range" min="0" max="0.8" step="0.01" value="${state.distortion}" />
              </label>
              <label class="control-card" data-fluid-card>
                <span>Trail length</span>
                <strong>${state.trailLength}</strong>
                <input id="trailLength" type="range" min="0" max="24" step="1" value="${state.trailLength}" />
              </label>
            </div>

            <div class="toggle-grid">
              <label class="toggle-card" data-fluid-card>
                <input id="glow" type="checkbox" ${state.glow ? "checked" : ""} />
                <span>Glow layers</span>
              </label>
              <label class="toggle-card" data-fluid-card>
                <input id="trail" type="checkbox" ${state.trail ? "checked" : ""} />
                <span>Fluid particle trail</span>
              </label>
              <label class="toggle-card" data-fluid-card>
                <input id="liquid" type="checkbox" ${state.liquid ? "checked" : ""} />
                <span>Liquid morph mode</span>
              </label>
              <label class="toggle-card" data-fluid-card>
                <input id="melt" type="checkbox" ${state.melt ? "checked" : ""} />
                <span>Melting trail blur</span>
              </label>
              <label class="toggle-card" data-fluid-card>
                <input id="physics" type="checkbox" ${state.physics ? "checked" : ""} />
                <span>DOM magnetic illusion</span>
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  `

	bindControls()
	updateCodePreview()
}

function bindRangeInput(id: string, onChange: (value: string) => void) {
	const input = document.querySelector<HTMLInputElement>(`#${id}`)
	input?.addEventListener("input", () => {
		onChange(input.value)
		mountCursor()
		render()
	})
}

function bindToggleInput(id: string, onChange: (checked: boolean) => void) {
	const input = document.querySelector<HTMLInputElement>(`#${id}`)
	input?.addEventListener("change", () => {
		onChange(input.checked)
		mountCursor()
		render()
	})
}

function bindControls() {
	bindRangeInput("size", (value) => {
		state.size = Number(value)
	})

	bindRangeInput("speed", (value) => {
		state.speed = Number(value)
	})

	bindRangeInput("color", (value) => {
		state.color = value
	})

	bindRangeInput("magnetism", (value) => {
		state.magnetism = Number(value)
	})

	bindRangeInput("distortion", (value) => {
		state.distortion = Number(value)
	})

	bindRangeInput("trailLength", (value) => {
		state.trailLength = Number(value)
	})

	bindToggleInput("glow", (checked) => {
		state.glow = checked
	})

	bindToggleInput("trail", (checked) => {
		state.trail = checked
	})

	bindToggleInput("liquid", (checked) => {
		state.liquid = checked
	})

	bindToggleInput("melt", (checked) => {
		state.melt = checked
	})

	bindToggleInput("physics", (checked) => {
		state.physics = checked
	})

	const colorInput = document.querySelector<HTMLInputElement>("#color")
	colorInput?.addEventListener("input", () => {
		state.color = colorInput.value
		mountCursor()
		render()
	})

	document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => {
		button.addEventListener("click", () => {
			const presetKey = button.dataset.preset as keyof typeof presets
			const preset = presets[presetKey]
			if (!preset) {
				return
			}

			activePreset = presetKey
			state.blendMode = preset.blendMode
			state.color = preset.color
			state.distortion = preset.distortion
			state.magnetism = preset.magnetism
			state.size = preset.size
			state.speed = preset.speed
			mountCursor()
			render()
		})
	})

	document
		.querySelector<HTMLElement>("[data-scroll-showcase]")
		?.addEventListener("click", () => {
			document
				.querySelector<HTMLElement>("#reactor")
				?.scrollIntoView({ behavior: "smooth", block: "center" })
		})
}

function updateCodePreview() {
	const code = document.querySelector<HTMLElement>("#code-preview")
	if (!code) {
		return
	}

  code.textContent = `import { FluidCursor } from "@turan95/fluid-cursor"

new FluidCursor({
  liquid: ${state.liquid},
  melt: ${state.melt},
  physics: ${state.physics},
  magnetism: ${state.magnetism.toFixed(2)},
  distortion: ${state.distortion.toFixed(2)},
  trailLength: ${state.trailLength},
  size: ${state.size},
  color: "${state.color}",
  speed: ${state.speed.toFixed(2)},
  glow: ${state.glow},
  trail: ${state.trail},
  blendMode: "${state.blendMode}"
})`
}

function mountCursor() {
	cursor?.destroy()
	cursor = new FluidCursor({
		blendMode: state.blendMode,
		color: state.color,
		distortion: state.distortion,
		glow: state.glow,
		liquid: state.liquid,
		magnetism: state.magnetism,
		melt: state.melt,
		physics: state.physics,
		size: state.size,
		speed: state.speed,
		trail: state.trail,
		trailLength: state.trailLength
	})
}

render()
mountCursor()

window.addEventListener("beforeunload", () => {
	cursor?.destroy()
})
