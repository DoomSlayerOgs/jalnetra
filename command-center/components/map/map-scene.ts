import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MAP_HEIGHT, MAP_WIDTH, pointInPolygon } from '@/lib/geo'
import { RISK_COLOR } from '@/lib/labels'
import type { Point, RiskLevel, Ward } from '@/lib/types'

export type SceneMarker = {
  id: string
  kind: 'report' | 'critical' | 'shelter' | 'volunteer' | 'pick'
  point: Point
  label: string
  selected?: boolean
}

export type HoverInfo = { x: number; y: number; title: string; subtitle?: string } | null

type Handlers = {
  onHover: (info: HoverInfo) => void
  onWard: (wardId: string, point: Point) => void
  onMarker: (id: string) => void
  wardSubtitle: (wardId: string) => string
}

/** Map units → world units. Map is 400×640 units, world is 40×64. */
const SCALE = 10
const toWorld = (p: Point) => new THREE.Vector3((p.x - MAP_WIDTH / 2) / SCALE, 0, (p.y - MAP_HEIGHT / 2) / SCALE)
const toMap = (v: THREE.Vector3): Point => ({
  x: Math.round(v.x * SCALE + MAP_WIDTH / 2),
  y: Math.round(v.z * SCALE + MAP_HEIGHT / 2),
})

export const RISK_HEIGHT: Record<RiskLevel, number> = {
  unknown: 0.5,
  lower: 0.8,
  watch: 1.3,
  high: 2,
  critical: 2.8,
}

const BG = new THREE.Color('#060b16')
const DEFAULT_CAM = new THREE.Vector3(0, 46, 52)
const TOP_CAM = new THREE.Vector3(0, 82, 0.01)

type WardEntry = { ward: Ward; mesh: THREE.Mesh; edges: THREE.LineSegments; height: number; label: HTMLDivElement }

export class MapScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private wardGroup = new THREE.Group()
  private markerGroup = new THREE.Group()
  private water: THREE.Mesh
  private waterBase: Float32Array
  private wards: WardEntry[] = []
  private pulses: THREE.Object3D[] = []
  private labelLayer: HTMLDivElement
  private frame = 0
  private disposed = false
  private hoverWard: string | null = null
  private selectedWard: string | null = null
  private downAt: { x: number; y: number } | null = null
  private ro: ResizeObserver
  private clock = new THREE.Clock()
  private camTween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; t: number } | null = null
  private showLabels = true
  private waterLevel = 0.25

  private geo = {
    pinHead: new THREE.SphereGeometry(0.38, 20, 14),
    pinStick: new THREE.CylinderGeometry(0.06, 0.06, 1, 8),
    ring: new THREE.RingGeometry(0.55, 0.75, 32),
    shelter: new THREE.BoxGeometry(0.75, 0.6, 0.75),
    roof: new THREE.ConeGeometry(0.62, 0.45, 4),
    volunteer: new THREE.ConeGeometry(0.34, 0.85, 16),
    beam: new THREE.CylinderGeometry(0.08, 0.08, 6, 12, 1, true),
  }
  private mat = {
    report: new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.35, roughness: 0.4 }),
    critical: new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.6, roughness: 0.35 }),
    shelter: new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.3, roughness: 0.5 }),
    volunteer: new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 0.35, roughness: 0.4 }),
    stick: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.6 }),
    pulse: new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    selRing: new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    pick: new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  }

  constructor(
    private container: HTMLElement,
    private handlers: Handlers,
    private opts: { reducedMotion: boolean; pickMode: boolean },
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(BG)
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.touchAction = 'none'
    container.appendChild(this.renderer.domElement)

    this.labelLayer = document.createElement('div')
    this.labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;'
    container.appendChild(this.labelLayer)

    this.scene.background = BG
    this.scene.fog = new THREE.Fog(BG, 90, 170)

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400)
    this.camera.position.copy(DEFAULT_CAM)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.maxPolarAngle = 1.32
    this.controls.minDistance = 14
    this.controls.maxDistance = 130
    this.controls.target.set(0, 0, 0)
    this.controls.autoRotateSpeed = 0.6

    this.scene.add(new THREE.HemisphereLight('#b9cdf5', '#0b1220', 0.5))
    const sun = new THREE.DirectionalLight('#ffffff', 0.8)
    sun.position.set(25, 50, 30)
    this.scene.add(sun)
    const rim = new THREE.DirectionalLight('#38bdf8', 0.35)
    rim.position.set(-30, 20, -40)
    this.scene.add(rim)

    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: '#07152b', roughness: 0.9 }),
    )
    sea.rotation.x = -Math.PI / 2
    sea.position.y = -0.05
    this.scene.add(sea)

    const grid = new THREE.GridHelper(120, 60, '#1e3a5f', '#10213a')
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.45
    grid.position.y = -0.02
    this.scene.add(grid)

    const waterGeo = new THREE.PlaneGeometry(40, 70, 48, 80)
    waterGeo.rotateX(-Math.PI / 2)
    this.waterBase = Float32Array.from(waterGeo.attributes.position.array as Float32Array)
    this.water = new THREE.Mesh(
      waterGeo,
      new THREE.MeshStandardMaterial({
        color: '#0369a1',
        transparent: true,
        opacity: 0.22,
        roughness: 0.15,
        metalness: 0.3,
        depthWrite: false,
      }),
    )
    this.water.position.y = this.waterLevel
    this.water.renderOrder = 2
    this.scene.add(this.water)

    this.scene.add(this.wardGroup, this.markerGroup)

    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerleave', this.onLeave)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.resize()
    this.loop()
  }

  private resize() {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = `${w}px`
    this.renderer.domElement.style.height = `${h}px`
    this.camera.aspect = w / h
    // Narrow containers need a wider vertical view to fit the portrait map.
    this.camera.fov = w / h < 0.8 ? 52 : 38
    this.camera.updateProjectionMatrix()
  }

  heightAt(p: Point) {
    const w = this.wards.find((x) => pointInPolygon(p, x.ward.polygon))
    return w ? w.height : 0
  }

  setWards(wards: Ward[], levels: Record<string, RiskLevel>, selectedId: string | null) {
    for (const w of this.wards) {
      w.mesh.geometry.dispose()
      ;(w.mesh.material as THREE.Material).dispose()
      w.edges.geometry.dispose()
      ;(w.edges.material as THREE.Material).dispose()
      w.label.remove()
    }
    this.wardGroup.clear()
    this.wards = []
    this.selectedWard = selectedId

    for (const ward of wards) {
      const level = levels[ward.id] ?? 'unknown'
      const height = RISK_HEIGHT[level] + ward.susceptibility * 0.4
      const shape = new THREE.Shape(ward.polygon.map((p) => new THREE.Vector2((p.x - MAP_WIDTH / 2) / SCALE, -(p.y - MAP_HEIGHT / 2) / SCALE)))
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 })
      geometry.rotateX(-Math.PI / 2)
      const color = new THREE.Color(RISK_COLOR[level])
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.12,
        roughness: 0.7,
        metalness: 0.05,
        transparent: true,
        opacity: level === 'unknown' ? 0.55 : 0.9,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.userData.wardId = ward.id
      // Small gap between tiles reads as streets.
      mesh.scale.set(0.97, 1, 0.97)
      const c = toWorld(ward.center)
      mesh.position.set(c.x * 0.03, 0, c.z * 0.03)

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 30),
        new THREE.LineBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.18 }),
      )
      edges.scale.copy(mesh.scale)
      edges.position.copy(mesh.position)
      this.wardGroup.add(mesh, edges)

      const label = document.createElement('div')
      label.style.cssText =
        'position:absolute;left:0;top:0;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;font:600 11px/1.15 var(--font-inter),system-ui,sans-serif;color:#f8fafc;text-shadow:0 1px 3px rgba(0,0,0,.9);will-change:transform;'
      label.innerHTML = `<div>${ward.code}</div><div style="font-weight:500;font-size:9px;color:#cbd5e1">${ward.name}</div>`
      this.labelLayer.appendChild(label)

      this.wards.push({ ward, mesh, edges, height, label })
    }
    this.applyWardStyles()
  }

  private applyWardStyles() {
    for (const w of this.wards) {
      const m = w.mesh.material as THREE.MeshStandardMaterial
      const e = w.edges.material as THREE.LineBasicMaterial
      const selected = w.ward.id === this.selectedWard
      const hovered = w.ward.id === this.hoverWard
      m.emissiveIntensity = selected ? 0.45 : hovered ? 0.28 : 0.06
      e.opacity = selected ? 1 : hovered ? 0.6 : 0.18
      const lift = selected ? 0.35 : hovered ? 0.12 : 0
      w.mesh.position.y = lift
      w.edges.position.y = lift
    }
  }

  setMarkers(markers: SceneMarker[]) {
    for (const p of this.pulses) {
      const mat = (p as THREE.Mesh).material as THREE.Material
      if (mat !== this.mat.pick) mat.dispose()
    }
    this.markerGroup.clear()
    this.pulses = []
    for (const m of markers) {
      const g = new THREE.Group()
      g.userData.markerId = m.kind === 'pick' ? null : m.id
      g.userData.label = m.label
      const base = toWorld(m.point)
      const top = this.heightAt(m.point) + (this.wards.find((w) => w.ward.id === this.selectedWard && pointInPolygon(m.point, w.ward.polygon)) ? 0.35 : 0)
      g.position.set(base.x, top + 0.12, base.z)

      if (m.kind === 'report' || m.kind === 'critical') {
        const stick = new THREE.Mesh(this.geo.pinStick, this.mat.stick)
        stick.position.y = 0.5
        const head = new THREE.Mesh(this.geo.pinHead, m.kind === 'critical' ? this.mat.critical : this.mat.report)
        head.position.y = 1.15
        g.add(stick, head)
        if (m.kind === 'critical') {
          const pulse = new THREE.Mesh(this.geo.ring, this.mat.pulse.clone())
          pulse.rotation.x = -Math.PI / 2
          pulse.position.y = 0.03
          g.add(pulse)
          this.pulses.push(pulse)
        }
      } else if (m.kind === 'shelter') {
        const box = new THREE.Mesh(this.geo.shelter, this.mat.shelter)
        box.position.y = 0.3
        const roof = new THREE.Mesh(this.geo.roof, this.mat.shelter)
        roof.position.y = 0.82
        roof.rotation.y = Math.PI / 4
        g.add(box, roof)
      } else if (m.kind === 'volunteer') {
        const cone = new THREE.Mesh(this.geo.volunteer, this.mat.volunteer)
        cone.position.y = 0.45
        g.add(cone)
      } else {
        const beam = new THREE.Mesh(this.geo.beam, this.mat.pick)
        beam.position.y = 3
        const ring = new THREE.Mesh(this.geo.ring, this.mat.pick)
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.04
        ring.scale.setScalar(1.3)
        g.add(beam, ring)
        this.pulses.push(ring)
      }

      if (m.selected) {
        const sel = new THREE.Mesh(this.geo.ring, this.mat.selRing)
        sel.rotation.x = -Math.PI / 2
        sel.position.y = 0.05
        sel.scale.setScalar(1.25)
        g.add(sel)
        g.scale.setScalar(1.35)
      }
      g.traverse((o) => (o.userData.markerId = g.userData.markerId))
      this.markerGroup.add(g)
    }
  }

  setWaterLevel(level: number) {
    this.waterLevel = level
    this.water.position.y = level
    ;(this.water.material as THREE.MeshStandardMaterial).opacity = 0.18 + Math.min(level / 3, 1) * 0.3
  }

  setLabels(show: boolean) {
    this.showLabels = show
    this.labelLayer.style.display = show ? 'block' : 'none'
  }

  setAutoRotate(on: boolean) {
    this.controls.autoRotate = on && !this.opts.reducedMotion
  }

  private flyTo(pos: THREE.Vector3, target: THREE.Vector3) {
    if (this.opts.reducedMotion) {
      this.camera.position.copy(pos)
      this.controls.target.copy(target)
      return
    }
    this.camTween = { from: this.camera.position.clone(), to: pos, tFrom: this.controls.target.clone(), tTo: target, t: 0 }
  }

  resetView() {
    this.flyTo(DEFAULT_CAM.clone(), new THREE.Vector3())
  }

  topView() {
    this.flyTo(TOP_CAM.clone(), new THREE.Vector3())
  }

  zoom(factor: number) {
    const dir = this.camera.position.clone().sub(this.controls.target)
    const len = THREE.MathUtils.clamp(dir.length() * factor, this.controls.minDistance, this.controls.maxDistance)
    this.flyTo(this.controls.target.clone().add(dir.setLength(len)), this.controls.target.clone())
  }

  focus(p: Point) {
    const t = toWorld(p)
    t.y = this.heightAt(p)
    const offset = new THREE.Vector3(0, 22, 24)
    this.flyTo(t.clone().add(offset), t)
  }

  private setPointer(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    return r
  }

  private hit(e: PointerEvent) {
    this.setPointer(e)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const mHit = this.raycaster.intersectObjects(this.markerGroup.children, true).find((h) => h.object.userData.markerId)
    if (mHit) return { kind: 'marker' as const, id: mHit.object.userData.markerId as string, point: mHit.point }
    const wHit = this.raycaster.intersectObjects(this.wards.map((w) => w.mesh), false)[0]
    if (wHit) return { kind: 'ward' as const, id: wHit.object.userData.wardId as string, point: wHit.point }
    return null
  }

  private onDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY }
    this.camTween = null
  }

  private onUp = (e: PointerEvent) => {
    if (!this.downAt) return
    const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y)
    this.downAt = null
    if (moved > 6) return
    const h = this.hit(e)
    if (!h) return
    if (h.kind === 'marker' && !this.opts.pickMode) this.handlers.onMarker(h.id)
    else {
      const wardEntry = this.wards.find((w) => w.ward.id === (h.kind === 'ward' ? h.id : null)) ?? this.wards.find((w) => pointInPolygon(toMap(h.point), w.ward.polygon))
      if (!wardEntry) return
      let pt = toMap(h.point)
      if (!pointInPolygon(pt, wardEntry.ward.polygon)) pt = wardEntry.ward.center
      this.handlers.onWard(wardEntry.ward.id, pt)
    }
  }

  private moveQueued = false
  private lastMove: PointerEvent | null = null
  private onMove = (e: PointerEvent) => {
    this.lastMove = e
    if (this.moveQueued) return
    this.moveQueued = true
    requestAnimationFrame(() => {
      this.moveQueued = false
      const ev = this.lastMove
      if (!ev || this.disposed) return
      const r = this.renderer.domElement.getBoundingClientRect()
      const h = this.hit(ev)
      const prevWard = this.hoverWard
      this.hoverWard = h?.kind === 'ward' ? h.id : null
      if (prevWard !== this.hoverWard) this.applyWardStyles()
      this.renderer.domElement.style.cursor = h ? (this.opts.pickMode ? 'crosshair' : 'pointer') : 'grab'
      if (!h) return this.handlers.onHover(null)
      const pos = { x: ev.clientX - r.left, y: ev.clientY - r.top }
      if (h.kind === 'marker') {
        const marker = this.markerGroup.children.find((g) => g.userData.markerId === h.id)
        this.handlers.onHover({ ...pos, title: (marker?.userData.label as string) ?? h.id })
      } else {
        const w = this.wards.find((x) => x.ward.id === h.id)
        if (w) this.handlers.onHover({ ...pos, title: `${w.ward.code} · ${w.ward.name}`, subtitle: this.handlers.wardSubtitle(w.ward.id) })
      }
    })
  }

  private onLeave = () => {
    this.hoverWard = null
    this.applyWardStyles()
    this.handlers.onHover(null)
  }

  private loop = () => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.loop)
    const t = this.clock.getElapsedTime()

    if (this.camTween) {
      this.camTween.t = Math.min(1, this.camTween.t + 0.035)
      const k = 1 - Math.pow(1 - this.camTween.t, 3)
      this.camera.position.lerpVectors(this.camTween.from, this.camTween.to, k)
      this.controls.target.lerpVectors(this.camTween.tFrom, this.camTween.tTo, k)
      if (this.camTween.t >= 1) this.camTween = null
    }
    this.controls.update()

    if (!this.opts.reducedMotion) {
      const pos = this.water.geometry.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let i = 0; i < arr.length; i += 3) {
        const x = this.waterBase[i]
        const z = this.waterBase[i + 2]
        arr[i + 1] = Math.sin(x * 0.45 + t * 1.3) * 0.07 + Math.cos(z * 0.38 + t * 0.9) * 0.07
      }
      pos.needsUpdate = true
      for (const p of this.pulses) {
        const s = 1 + ((t * 0.9) % 1) * 1.6
        p.scale.setScalar(s)
        const mat = (p as THREE.Mesh).material as THREE.MeshBasicMaterial
        if (mat !== this.mat.pick) mat.opacity = 0.7 * (1 - ((t * 0.9) % 1))
      }
    }

    if (this.showLabels) {
      const w = this.container.clientWidth
      const h = this.container.clientHeight
      const v = new THREE.Vector3()
      for (const entry of this.wards) {
        v.copy(toWorld(entry.ward.center))
        v.y = entry.height + 0.5 + (entry.ward.id === this.selectedWard ? 0.35 : 0)
        v.project(this.camera)
        const visible = v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1
        entry.label.style.display = visible ? 'block' : 'none'
        if (visible) {
          entry.label.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%,-50%)`
          entry.label.style.opacity = entry.ward.id === this.selectedWard ? '1' : '0.88'
        }
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.ro.disconnect()
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerleave', this.onLeave)
    this.controls.dispose()
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      mesh.geometry?.dispose()
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m?.dispose()
    })
    Object.values(this.geo).forEach((g) => g.dispose())
    Object.values(this.mat).forEach((m) => m.dispose())
    this.renderer.dispose()
    el.remove()
    this.labelLayer.remove()
  }
}
