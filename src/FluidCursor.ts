import baseStyles from "./styles.css?inline"

export type BlendMode =
	| "normal"
	| "multiply"
	| "screen"
	| "overlay"
	| "darken"
	| "lighten"
	| "color-dodge"
	| "color-burn"
	| "hard-light"
	| "soft-light"
	| "difference"
	| "exclusion"
	| "hue"
	| "saturation"
	| "color"
	| "luminosity"
	| "plus-darker"
	| "plus-lighter"

type PhysicsKind = "button" | "card" | "text"

export interface FluidCursorOptions {
	size?: number
	color?: string
	speed?: number
	glow?: boolean
	trail?: boolean
	blendMode?: BlendMode
	disableOnMobile?: boolean
	zIndex?: number
	trailCount?: number
	trailLifetime?: number
	trailSpawnInterval?: number
	elasticity?: number
	liquid?: boolean
	melt?: boolean
	physics?: boolean
	magnetism?: number
	distortion?: number
	trailLength?: number
}

interface ResolvedFluidCursorOptions {
	blendMode: BlendMode
	color: string
	disableOnMobile: boolean
	distortion: number
	elasticity: number
	glow: boolean
	liquid: boolean
	magnetism: number
	melt: boolean
	physics: boolean
	size: number
	speed: number
	trail: boolean
	trailCount: number
	trailLength: number
	trailLifetime: number
	trailSpawnInterval: number
	zIndex: number
}

interface Particle {
	active: boolean
	age: number
	element: HTMLDivElement
	opacity: number
	rotation: number
	scale: number
	size: number
	stretch: number
	ttl: number
	vx: number
	vy: number
	x: number
	y: number
}

interface Point {
	x: number
	y: number
}

interface LiquidNode {
	element: HTMLDivElement
	frequency: number
	intensity: number
	lag: number
	phase: number
	position: Point
	scale: number
	spin: number
	stretch: number
}

interface PhysicsTarget {
	centerX: number
	centerY: number
	element: HTMLElement
	kind: PhysicsKind
}

const DEFAULT_OPTIONS: ResolvedFluidCursorOptions = {
	blendMode: "screen",
	color: "#00ffff",
	disableOnMobile: true,
	distortion: 0.2,
	elasticity: 0.18,
	glow: true,
	liquid: true,
	magnetism: 0.4,
	melt: true,
	physics: false,
	size: 24,
	speed: 0.15,
	trail: true,
	trailCount: 14,
	trailLength: 12,
	trailLifetime: 520,
	trailSpawnInterval: 18,
	zIndex: 2147483646
}

const STYLE_ID = "fluid-cursor-runtime-styles"
const PHYSICS_TARGET_LIMIT = 48
let activeInstances = 0

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

function colorToRgbChannels(color: string): string {
	const hexMatch = color.trim().match(/^#([\da-f]{3,8})$/i)
	if (hexMatch) {
		const raw = hexMatch[1]
		const normalized =
			raw.length === 3 || raw.length === 4
				? raw
						.slice(0, 3)
						.split("")
						.map((channel) => channel + channel)
						.join("")
				: raw.slice(0, 6)

		const numeric = Number.parseInt(normalized, 16)
		const red = (numeric >> 16) & 255
		const green = (numeric >> 8) & 255
		const blue = numeric & 255
		return `${red}, ${green}, ${blue}`
	}

	const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i)
	if (rgbMatch) {
		return rgbMatch[1]
			.split(",")
			.slice(0, 3)
			.map((value) => Number.parseFloat(value).toString())
			.join(", ")
	}

	return "0, 255, 255"
}

function ensureStyleElement(): void {
	if (typeof document === "undefined") {
		return
	}

	if (!document.getElementById(STYLE_ID)) {
		const style = document.createElement("style")
		style.id = STYLE_ID
		style.textContent = baseStyles
		document.head.append(style)
	}

	activeInstances += 1
}

function releaseStyleElement(): void {
	if (typeof document === "undefined") {
		return
	}

	activeInstances = Math.max(0, activeInstances - 1)
	if (activeInstances > 0) {
		return
	}

	document.getElementById(STYLE_ID)?.remove()
}

function prefersCoarsePointer(): boolean {
	if (typeof window === "undefined") {
		return false
	}

	return window.matchMedia?.("(pointer: coarse)").matches ?? false
}

function normalize(dx: number, dy: number): Point {
	const distance = Math.hypot(dx, dy) || 1
	return {
		x: dx / distance,
		y: dy / distance
	}
}

export class FluidCursor {
	private readonly options: ResolvedFluidCursorOptions
	private readonly onBlur = () => {
		this.setVisible(false)
		this.resetPhysicsStyles()
		this.stopAnimation()
	}
	private readonly onFocus = () => {
		this.resumeIfPossible()
	}
	private readonly onPointerLeave = () => {
		this.pointerActive = false
		this.setVisible(false)
		this.resetPhysicsStyles()
	}
	private readonly onPointerMove = (event: PointerEvent) => {
		this.pointer.x = event.clientX
		this.pointer.y = event.clientY
		this.pointerActive = true
		this.setVisible(true)

		if (!this.hasInteracted) {
			this.current.x = event.clientX
			this.current.y = event.clientY
			this.previous.x = event.clientX
			this.previous.y = event.clientY
			this.hasInteracted = true
		}

		this.resumeIfPossible()
	}
	private readonly onResize = () => {
		this.viewportWidth = window.innerWidth
		this.viewportHeight = window.innerHeight
		this.mobileDisabled = this.shouldDisableForEnvironment()
		this.physicsBoundsDirty = true

		if (this.mobileDisabled) {
			this.stopAnimation()
			this.setVisible(false)
			this.resetPhysicsStyles()
			return
		}

		this.resumeIfPossible()
	}
	private readonly onScroll = () => {
		this.physicsBoundsDirty = true
	}
	private readonly onVisibilityChange = () => {
		this.pageVisible = document.visibilityState !== "hidden"
		if (!this.pageVisible) {
			this.setVisible(false)
			this.resetPhysicsStyles()
			this.stopAnimation()
			return
		}

		this.resumeIfPossible()
	}

	private core: HTMLDivElement | null = null
	private current: Point = { x: 0, y: 0 }
	private destroyed = false
	private glow: HTMLDivElement | null = null
	private hasInteracted = false
	private lastBoundsUpdate = 0
	private lastFrameTime = 0
	private lastSpawnTime = 0
	private liquidNodes: LiquidNode[] = []
	private membrane: HTMLDivElement | null = null
	private mobileDisabled = false
	private pageVisible = true
	private particleLayer: HTMLDivElement | null = null
	private particles: Particle[] = []
	private physicsBoundsDirty = true
	private physicsTargets: PhysicsTarget[] = []
	private pointer: Point = { x: 0, y: 0 }
	private pointerActive = false
	private previous: Point = { x: 0, y: 0 }
	private rafId = 0
	private root: HTMLDivElement | null = null
	private velocity: Point = { x: 0, y: 0 }
	private viewportHeight = 0
	private viewportWidth = 0

	constructor(options: FluidCursorOptions = {}) {
		this.options = {
			...DEFAULT_OPTIONS,
			...options,
			distortion: clamp(options.distortion ?? DEFAULT_OPTIONS.distortion, 0, 1),
			elasticity: clamp(options.elasticity ?? DEFAULT_OPTIONS.elasticity, 0.08, 0.45),
			magnetism: clamp(options.magnetism ?? DEFAULT_OPTIONS.magnetism, 0, 1),
			size: clamp(options.size ?? DEFAULT_OPTIONS.size, 8, 64),
			speed: clamp(options.speed ?? DEFAULT_OPTIONS.speed, 0.06, 0.32),
			trailCount: clamp(options.trailCount ?? DEFAULT_OPTIONS.trailCount, 0, 24),
			trailLength: clamp(options.trailLength ?? DEFAULT_OPTIONS.trailLength, 0, 24),
			trailLifetime: clamp(
				options.trailLifetime ?? DEFAULT_OPTIONS.trailLifetime,
				180,
				1200
			),
			trailSpawnInterval: clamp(
				options.trailSpawnInterval ?? DEFAULT_OPTIONS.trailSpawnInterval,
				8,
				80
			),
			zIndex: clamp(options.zIndex ?? DEFAULT_OPTIONS.zIndex, 1, 2147483646)
		}

		if (typeof window === "undefined" || typeof document === "undefined") {
			return
		}

		this.viewportWidth = window.innerWidth
		this.viewportHeight = window.innerHeight
		this.pageVisible = document.visibilityState !== "hidden"
		this.mobileDisabled = this.shouldDisableForEnvironment()

		if (this.mobileDisabled) {
			return
		}

		ensureStyleElement()
		this.createDom()
		this.bindEvents()

		if (this.options.physics) {
			this.refreshPhysicsTargets()
		}

		this.resumeIfPossible()
	}

	destroy(): void {
		if (this.destroyed) {
			return
		}

		this.destroyed = true
		this.stopAnimation()
		this.resetPhysicsStyles()

		if (typeof window !== "undefined" && typeof document !== "undefined" && this.root) {
			window.removeEventListener("pointermove", this.onPointerMove)
			window.removeEventListener("pointerleave", this.onPointerLeave)
			window.removeEventListener("resize", this.onResize)
			window.removeEventListener("blur", this.onBlur)
			window.removeEventListener("focus", this.onFocus)
			window.removeEventListener("scroll", this.onScroll, true)
			document.removeEventListener("visibilitychange", this.onVisibilityChange)
			this.root.remove()
			this.liquidNodes = []
			this.particles = []
			releaseStyleElement()
		}

		this.root = null
		this.core = null
		this.glow = null
		this.membrane = null
		this.particleLayer = null
		this.physicsTargets = []
	}

	private bindEvents(): void {
		window.addEventListener("pointermove", this.onPointerMove, { passive: true })
		window.addEventListener("pointerleave", this.onPointerLeave, { passive: true })
		window.addEventListener("resize", this.onResize, { passive: true })
		window.addEventListener("blur", this.onBlur)
		window.addEventListener("focus", this.onFocus)
		window.addEventListener("scroll", this.onScroll, { passive: true, capture: true })
		document.addEventListener("visibilitychange", this.onVisibilityChange)
	}

	private createDom(): void {
		const root = document.createElement("div")
		root.className = "fluid-cursor-root"
		root.setAttribute("aria-hidden", "true")
		root.style.setProperty("--fc-size", `${this.options.size}px`)
		root.style.setProperty("--fc-color", this.options.color)
		root.style.setProperty("--fc-rgb", colorToRgbChannels(this.options.color))
		root.style.setProperty("--fc-blend-mode", this.options.blendMode)
		root.style.setProperty("--fc-z-index", String(this.options.zIndex))

		const glow = document.createElement("div")
		glow.className = "fluid-cursor-glow"
		glow.hidden = !this.options.glow

		const membrane = document.createElement("div")
		membrane.className = "fluid-cursor-membrane"
		membrane.hidden = !this.options.liquid

		const core = document.createElement("div")
		core.className = "fluid-cursor-core"

		const particleLayer = document.createElement("div")
		particleLayer.className = "fluid-cursor-particle-layer"
		particleLayer.hidden = !(this.options.trail || this.options.melt)

		root.append(glow, membrane)

		if (this.options.liquid) {
			this.liquidNodes = [
				this.createLiquidNode(
					"fluid-cursor-satellite fluid-cursor-satellite-a",
					0.12,
					0.96,
					0.18,
					2.6,
					1.28
				),
				this.createLiquidNode(
					"fluid-cursor-satellite fluid-cursor-satellite-b",
					0.16,
					0.76,
					-0.34,
					-2.1,
					1.12
				),
				this.createLiquidNode(
					"fluid-cursor-satellite fluid-cursor-satellite-c",
					0.1,
					1.22,
					0.52,
					1.4,
					1.52
				)
			]

			for (const node of this.liquidNodes) {
				root.append(node.element)
			}
		}

		root.append(core, particleLayer)
		document.body.append(root)

		this.root = root
		this.glow = glow
		this.membrane = membrane
		this.core = core
		this.particleLayer = particleLayer

		this.createParticlePool()
	}

	private createLiquidNode(
		className: string,
		lag: number,
		scale: number,
		phase: number,
		spin: number,
		stretch: number
	): LiquidNode {
		const element = document.createElement("div")
		element.className = className

		return {
			element,
			frequency: 0.85 + Math.abs(spin) * 0.18,
			intensity: 0.64 + scale * 0.22,
			lag,
			phase,
			position: { x: -240, y: -240 },
			scale,
			spin,
			stretch
		}
	}

	private createParticlePool(): void {
		if (!this.particleLayer) {
			return
		}

		this.particleLayer.innerHTML = ""
		this.particles = []

		const particleCount = clamp(
			Math.max(this.options.trailLength, this.options.trailCount),
			0,
			28
		)

		for (let index = 0; index < particleCount; index += 1) {
			const element = document.createElement("div")
			element.className = "fluid-cursor-particle"
			element.style.opacity = "0"
			this.particleLayer.append(element)

			this.particles.push({
				active: false,
				age: 0,
				element,
				opacity: 0,
				rotation: 0,
				scale: 1,
				size: this.options.size * 0.5,
				stretch: 1.2,
				ttl: this.options.trailLifetime,
				vx: 0,
				vy: 0,
				x: 0,
				y: 0
			})
		}
	}

	private renderFrame = (time: number) => {
		if (!this.core || !this.root) {
			return
		}

		const delta =
			this.lastFrameTime === 0
				? 1
				: clamp((time - this.lastFrameTime) / 16.667, 0.5, 2.25)
		this.lastFrameTime = time

		const targetX = clamp(this.pointer.x, 0, this.viewportWidth)
		const targetY = clamp(this.pointer.y, 0, this.viewportHeight)

		const follow = 1 - Math.pow(1 - this.options.speed, delta)
		const spring = this.options.elasticity * (this.options.liquid ? 0.2 : 0.14) * delta
		const damping = Math.pow(this.options.liquid ? 0.75 : 0.78, delta)

		this.velocity.x += (targetX - this.current.x) * spring
		this.velocity.y += (targetY - this.current.y) * spring
		this.velocity.x *= damping
		this.velocity.y *= damping

		this.current.x += (targetX - this.current.x) * follow + this.velocity.x
		this.current.y += (targetY - this.current.y) * follow + this.velocity.y

		const vx = this.current.x - this.previous.x
		const vy = this.current.y - this.previous.y
		this.previous.x = this.current.x
		this.previous.y = this.current.y

		const velocityMagnitude = Math.hypot(vx, vy)
		const movementForce = clamp(velocityMagnitude / 16, 0, 1)
		const rotation = Math.atan2(vy, vx || 0.0001)
		const wobble = this.options.liquid ? Math.sin(time * 0.011) * 0.05 : 0
		const scaleX = 1 + movementForce * (this.options.liquid ? 0.42 : 0.18)
		const scaleY = 1 - movementForce * (this.options.liquid ? 0.2 : 0.1)

		this.updateCursorTransform(
			this.core,
			this.current.x,
			this.current.y,
			this.options.size,
			scaleX,
			scaleY,
			rotation + wobble
		)

		if (this.membrane && this.options.liquid) {
			this.updateCursorTransform(
				this.membrane,
				this.current.x - vx * (1.1 + movementForce * 1.2),
				this.current.y - vy * (1.1 + movementForce * 1.2),
				this.options.size * (1.55 + movementForce * 0.42),
				1.06 + movementForce * 0.58,
				0.94 - movementForce * 0.2,
				rotation
			)
			this.membrane.style.opacity = (0.24 + movementForce * 0.42).toFixed(3)
		}

		if (this.glow && this.options.glow) {
			this.updateCursorTransform(
				this.glow,
				this.current.x - vx * (1.4 + movementForce),
				this.current.y - vy * (1.4 + movementForce),
				this.options.size * (2.8 + movementForce * 0.72),
				1 + movementForce * 0.24,
				1 + movementForce * 0.24,
				0
			)
			this.glow.style.opacity = (0.44 + movementForce * 0.36).toFixed(3)
		}

		if (this.options.liquid) {
			this.updateLiquidNodes(time, delta, rotation, vx, vy, movementForce)
		}

		if (this.options.trail || this.options.melt) {
			this.maybeSpawnParticle(time, velocityMagnitude)
			this.updateParticles(delta, movementForce)
		}

		if (this.options.physics) {
			this.updatePhysicsTargets(time)
		}

		this.rafId = window.requestAnimationFrame(this.renderFrame)
	}

	private maybeSpawnParticle(time: number, velocityMagnitude: number): void {
		if (
			!this.particleLayer ||
			velocityMagnitude < (this.options.melt ? 0.35 : 0.8) ||
			time - this.lastSpawnTime < this.options.trailSpawnInterval
		) {
			return
		}

		const particle = this.particles.find((entry) => !entry.active)
		if (!particle) {
			return
		}

		this.lastSpawnTime = time
		particle.active = true
		particle.age = 0
		particle.x = this.current.x - this.velocity.x * 1.8
		particle.y = this.current.y - this.velocity.y * 1.8
		particle.vx =
			-this.velocity.x * (this.options.melt ? 0.95 : 0.65) + (Math.random() - 0.5) * 1.2
		particle.vy =
			-this.velocity.y * (this.options.melt ? 0.95 : 0.65) + (Math.random() - 0.5) * 1.2
		particle.ttl = this.options.trailLifetime * (0.82 + Math.random() * 0.34)
		particle.size =
			this.options.size * (0.38 + Math.random() * (this.options.melt ? 0.52 : 0.36))
		particle.scale = 0.75 + Math.random() * 0.65
		particle.stretch = 1.15 + Math.random() * 1.35
		particle.opacity = (this.options.melt ? 0.42 : 0.28) + Math.random() * 0.24
		particle.rotation = Math.atan2(particle.vy, particle.vx || 0.0001)
	}

	private refreshPhysicsTargets(): void {
		if (typeof document === "undefined") {
			return
		}

		const selectors = [
			"[data-fluid-button]",
			"[data-fluid-card]",
			"[data-fluid-text]",
			"button",
			"a[href]",
			'[role="button"]',
			"article",
			"h1",
			"h2",
			"h3"
		]
		const elements = Array.from(
			document.querySelectorAll<HTMLElement>(selectors.join(","))
		)
		const seen = new Set<HTMLElement>()
		const nextTargets: PhysicsTarget[] = []

		for (const element of elements) {
			if (seen.has(element) || this.root?.contains(element)) {
				continue
			}

			seen.add(element)
			const kind = this.resolvePhysicsKind(element)
			element.classList.add("fluid-cursor-physics-target", `fluid-cursor-physics-${kind}`)
			nextTargets.push({
				centerX: 0,
				centerY: 0,
				element,
				kind
			})

			if (nextTargets.length >= PHYSICS_TARGET_LIMIT) {
				break
			}
		}

		this.physicsTargets = nextTargets
		this.physicsBoundsDirty = true
		this.lastBoundsUpdate = 0
	}

	private resetPhysicsStyles(): void {
		for (const target of this.physicsTargets) {
			target.element.style.translate = ""
			target.element.style.scale = ""
			target.element.style.rotate = ""
			target.element.style.transform = ""
			target.element.style.filter = ""
		}
	}

	private resolvePhysicsKind(element: HTMLElement): PhysicsKind {
		if (
			element.dataset.fluidButton !== undefined ||
			element.matches('button, a[href], [role="button"]')
		) {
			return "button"
		}

		if (element.dataset.fluidCard !== undefined || element.matches("article")) {
			return "card"
		}

		return "text"
	}

	private resumeIfPossible(): void {
		if (
			this.destroyed ||
			this.mobileDisabled ||
			!this.pageVisible ||
			!this.root ||
			this.rafId !== 0 ||
			!this.pointerActive
		) {
			return
		}

		if (this.options.physics && this.physicsTargets.length === 0) {
			this.refreshPhysicsTargets()
		}

		this.lastFrameTime = 0
		this.rafId = window.requestAnimationFrame(this.renderFrame)
	}

	private setVisible(visible: boolean): void {
		this.root?.setAttribute("data-visible", String(visible))
	}

	private shouldDisableForEnvironment(): boolean {
		return (
			this.options.disableOnMobile &&
			(navigator.maxTouchPoints > 0 || prefersCoarsePointer())
		)
	}

	private stopAnimation(): void {
		if (this.rafId !== 0) {
			window.cancelAnimationFrame(this.rafId)
			this.rafId = 0
		}
	}

	private updateCursorTransform(
		element: HTMLDivElement,
		x: number,
		y: number,
		size: number,
		scaleX: number,
		scaleY: number,
		rotation: number
	): void {
		const translateX = x - size * 0.5
		const translateY = y - size * 0.5
		element.style.width = `${size}px`
		element.style.height = `${size}px`
		element.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotation}rad) scale(${scaleX}, ${scaleY})`
	}

	private updateLiquidNodes(
		time: number,
		delta: number,
		rotation: number,
		vx: number,
		vy: number,
		movementForce: number
	): void {
		const timeFactor = time * 0.001
		const orbitRadius = this.options.size * (0.36 + movementForce * 0.56)
		const wakeX = -vx * (1.9 + movementForce * 2.4)
		const wakeY = -vy * (1.9 + movementForce * 2.4)

		for (const node of this.liquidNodes) {
			const wave = Math.sin(timeFactor * node.frequency + node.phase)
			const swirl = rotation + timeFactor * node.spin + node.phase
			const targetX =
				this.current.x +
				Math.cos(swirl) * orbitRadius * node.intensity +
				wakeX * node.lag * 2.6 +
				wave * this.options.size * 0.2
			const targetY =
				this.current.y +
				Math.sin(swirl) * orbitRadius * node.intensity +
				wakeY * node.lag * 2.6 +
				Math.cos(timeFactor * (node.frequency + 0.34) + node.phase) *
					this.options.size *
					0.16

			const ease =
				1 - Math.pow(1 - clamp(node.lag + this.options.speed * 0.28, 0.08, 0.24), delta)
			node.position.x += (targetX - node.position.x) * ease
			node.position.y += (targetY - node.position.y) * ease

			const localScaleX = node.stretch + movementForce * (0.34 + node.lag)
			const localScaleY = 1 / (1 + movementForce * 0.24)

			this.updateCursorTransform(
				node.element,
				node.position.x,
				node.position.y,
				this.options.size * node.scale,
				localScaleX,
				localScaleY,
				rotation + wave * 0.42
			)
			node.element.style.opacity = (0.16 + movementForce * 0.3 + node.lag * 0.22).toFixed(
				3
			)
		}
	}

	private updateParticles(delta: number, movementForce: number): void {
		for (const particle of this.particles) {
			if (!particle.active) {
				continue
			}

			particle.age += delta * 16.667
			if (particle.age >= particle.ttl) {
				particle.active = false
				particle.element.style.opacity = "0"
				continue
			}

			const progress = particle.age / particle.ttl
			particle.x += particle.vx * delta
			particle.y += particle.vy * delta
			particle.vx *= Math.pow(this.options.melt ? 0.92 : 0.94, delta)
			particle.vy *= Math.pow(this.options.melt ? 0.92 : 0.94, delta)

			const scale = particle.scale + progress * (this.options.melt ? 1.2 : 0.8)
			const stretch = particle.stretch + movementForce * 0.18
			const alpha = particle.opacity * (1 - progress)
			particle.element.style.width = `${particle.size}px`
			particle.element.style.height = `${particle.size}px`
			particle.element.style.opacity = alpha.toFixed(3)
			particle.element.style.transform = `translate3d(${particle.x - particle.size * 0.5}px, ${particle.y - particle.size * 0.5}px, 0) rotate(${particle.rotation}rad) scale(${stretch}, ${scale})`
		}
	}

	private updatePhysicsBounds(): void {
		for (const target of this.physicsTargets) {
			const rect = target.element.getBoundingClientRect()
			target.centerX = rect.left + rect.width * 0.5
			target.centerY = rect.top + rect.height * 0.5
		}

		this.physicsBoundsDirty = false
	}

	private updatePhysicsTargets(time: number): void {
		if (!this.pointerActive) {
			return
		}

		if (this.physicsBoundsDirty || time - this.lastBoundsUpdate > 140) {
			this.updatePhysicsBounds()
			this.lastBoundsUpdate = time
		}

		const buttonRadius = 180 + this.options.magnetism * 120
		const cardRadius = 240 + this.options.magnetism * 140
		const textRadius = 160 + this.options.magnetism * 100

		for (const target of this.physicsTargets) {
			const dx = target.centerX - this.current.x
			const dy = target.centerY - this.current.y
			const distance = Math.hypot(dx, dy)
			const radius =
				target.kind === "button"
					? buttonRadius
					: target.kind === "card"
						? cardRadius
						: textRadius

			if (distance >= radius) {
				target.element.style.translate = "0px 0px"
				target.element.style.scale = "1"
				target.element.style.rotate = "0deg"
				target.element.style.transform = ""
				target.element.style.filter = ""
				continue
			}

			const influence = Math.pow(1 - distance / radius, 1.45)
			const direction = normalize(dx, dy)

			if (target.kind === "button") {
				const repel = (14 + this.options.magnetism * 20) * influence
				const tx = direction.x * repel
				const ty = direction.y * repel
				target.element.style.translate = `${tx.toFixed(2)}px ${ty.toFixed(2)}px`
				target.element.style.scale = `${(1 + influence * (0.03 + this.options.magnetism * 0.05)).toFixed(4)}`
				target.element.style.rotate = `${(tx * 0.12).toFixed(2)}deg`
				target.element.style.transform = ""
				continue
			}

			if (target.kind === "card") {
				const pull = (6 + this.options.magnetism * 14) * influence
				const tx = -direction.x * pull
				const ty = -direction.y * pull
				const rotateX = clamp(
					(-dy / radius) * 14 * this.options.distortion * influence,
					-8,
					8
				)
				const rotateY = clamp(
					(dx / radius) * 16 * this.options.distortion * influence,
					-10,
					10
				)
				target.element.style.translate = `${tx.toFixed(2)}px ${ty.toFixed(2)}px`
				target.element.style.scale = `${(1 + influence * 0.02).toFixed(4)}`
				target.element.style.rotate = "0deg"
				target.element.style.transform = `perspective(960px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`
				continue
			}

			const sway = (4 + this.options.distortion * 10) * influence
			const tx = -direction.x * sway * 0.6
			const ty = -direction.y * sway * 0.6
			target.element.style.translate = `${tx.toFixed(2)}px ${ty.toFixed(2)}px`
			target.element.style.scale = `${(1 + influence * 0.015).toFixed(4)}`
			target.element.style.rotate = `${(-direction.x * sway * 0.2).toFixed(2)}deg`
			target.element.style.transform = ""
		}
	}
}
