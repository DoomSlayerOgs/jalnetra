import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const CONFIG = {
  rimColor: '#c1faff', rimPower: 2.4, nightLights: 10, terrainDepth: 0.33, terrainShade: 1.3,
  oceanGlint: 0.45, oceanDeep: 0.12, oceanFlow: 3, oceanFlowSpeed: 0.8, oceanFlowScale: 2.1,
  glowColor: '#3a6cff', glowIntensity: 3.35, planetRadius: 1.95, spin: 0.03, initRotation: 2.07,
  tilt: 0.37, autoRotate: 0,
  cloud1Height: 1.005, cloud1Opacity: 0.6, cloud1Spin: 0.06,
  cloud2Height: 1.03, cloud2Opacity: 0.5, cloud2Spin: 0.14,
  cloud3Height: 1.075, cloud3Opacity: 0.5, cloud3Spin: 0.1,
  bgColor: '#040a1e', flameColor: '#3a6cff', flameColor2: '#c1faff', flameAmt: 0.15,
  atmoColor: '#9fc4ff', atmoCount: 320, atmoSize: 22, atmoSpeed: 0.8,
  starColor: '#cfe0ff', starCount: 1400, starSize: 1.6, starFlicker: 1,
  markerColor: '#ffd27a', markerCount: 60, markerSize: 16, markerSpeed: 0.5,
}
const LAYERS = { NONE: 0, TORUS_SCENE: 1, BLOOM_SCENE: 2, ENTIRE_SCENE: 3 }

const ASSET_BASE_URL = 'https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2'
const PLANET_GLB = `${ASSET_BASE_URL}/planet.glb`
const PLANET_LIGHTS_GLB = `${ASSET_BASE_URL}/planet-lights.glb`
const PLANET_CLOUDS_PNG = `${ASSET_BASE_URL}/planet-clouds.png`

const STOPS_X = [{ p: 0, v: 0 }, { p: 0.32, v: -3.1 }, { p: 0.64, v: 3.2 }, { p: 1, v: 0 }]
const STOPS_Y = [{ p: 0, v: -4.5 }, { p: 0.32, v: 0.55 }, { p: 0.64, v: 0.45 }, { p: 1, v: 0.15 }]
const STOPS_S = [{ p: 0, v: 2.15 }, { p: 0.32, v: 1.0 }, { p: 0.64, v: 0.92 }, { p: 1, v: 1.12 }]

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const hexToVec3 = (hex: string) => {
  const c = new THREE.Color(hex)
  return new THREE.Vector3(c.r, c.g, c.b)
}
function sample(stops: { p: number; v: number }[], p: number) {
  if (p <= stops[0].p) return stops[0].v
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (p <= b.p) {
      let t = (p - a.p) / (b.p - a.p)
      t = t * t * (3 - 2 * t)
      return a.v + (b.v - a.v) * t
    }
  }
  return stops[stops.length - 1].v
}

const SNOISE = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`

const PLANET_INJECT = /* glsl */ `
#include <dithering_fragment>
vec3 normalizedNormal = normalize(vNormal);
vec3 viewDir = normalize(vViewPosition);
float rim = 1.0 - max(dot(viewDir, normalizedNormal), 0.0);
rim = pow(rim, rimPower); rim = pow(rim, 1.5); rim *= 0.7;
vec3 currentColor = gl_FragColor.rgb;
float blueDom = currentColor.b - max(currentColor.r, currentColor.g);
float waterMask = clamp(smoothstep(-0.005, 0.03, blueDom), 0.0, 1.0);
float shimmer = snoise(vec3(vCustomUv.x * noiseScale + time * speedX, vCustomUv.y * noiseScale - time * speedY, time * speedZ));
gl_FragColor.rgb += waterMask * shimmer * 0.025;
float fT = time * oceanFlowSpeed * 4.0;
float fS = 4.0 * oceanFlowScale;
float warp = snoise(vec3(vCustomUv.x * fS - fT * 0.5, vCustomUv.y * fS + fT * 0.4, fT * 0.5));
float flow = snoise(vec3(vCustomUv.x * fS * 2.0 + fT * 0.6 + warp, vCustomUv.y * fS * 2.0 - fT * 0.5, fT * 0.7));
flow = warp * 0.6 + flow * 0.4;
gl_FragColor.rgb += waterMask * flow * 0.12 * oceanFlow;
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.01, 0.06, 0.16), waterMask * oceanDeep);
vec3 finalColor = mix(gl_FragColor.rgb, rimColor, rim);
gl_FragColor = vec4(finalColor, 1.0);
vec3 surfPos = -vViewPosition;
float terrH = dot(texture2D(map, vCustomUv).rgb, vec3(0.299, 0.587, 0.114));
vec3 sigX = dFdx(surfPos), sigY = dFdy(surfPos);
vec3 vR1 = cross(sigY, normalizedNormal), vR2 = cross(normalizedNormal, sigX);
float fDet = dot(sigX, vR1);
vec3 vGrad = sign(fDet) * (dFdx(terrH) * vR1 + dFdy(terrH) * vR2);
vec3 bumpedNormal = normalize(abs(fDet) * normalizedNormal - terrainDepth * vGrad);
vec3 shadeNormal = mix(bumpedNormal, normalizedNormal, waterMask);
vec3 cityLights = texture2D(nightBlendTexture, vCustomUv).rgb * gl_FragColor.rgb * nightLights;
vec3 viewSunDir = normalize(vec3(-0.9, 0.18, 0.4));
float ndl = dot(normalizedNormal, viewSunDir);
float dayAmt = smoothstep(-0.05, 0.35, ndl);
float relief = dot(shadeNormal, viewSunDir) - ndl;
gl_FragColor.rgb *= clamp(1.0 + relief * terrainShade * dayAmt, 0.55, 1.6);
float nightFactor  = smoothstep(0.18, -0.30, ndl);
float lightsFactor = smoothstep(0.30, -0.35, ndl);
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.08, nightFactor);
gl_FragColor.rgb += cityLights * lightsFactor;
vec3 halfDir = normalize(viewSunDir + viewDir);
float ripple = snoise(vec3(vCustomUv * 240.0, time * 4.0));
float ndh = max(dot(normalizedNormal, halfDir) + ripple * 0.02, 0.0);
float glint = pow(ndh, 140.0);
gl_FragColor.rgb += glint * waterMask * dayAmt * oceanGlint * vec3(1.0, 0.97, 0.88);
`

const CLOUD_INJECT = /* glsl */ `
#include <dithering_fragment>
gl_FragColor.rgb = vec3(1.0);
float cloudNoise = snoise(vec3(vCloudUv.x * noiseScale + uTime * uSpeedX + uPhase, vCloudUv.y * noiseScale - uTime * uSpeedY + uPhase, uTime * uSpeedZ + uPhase));
float cloudNdv = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
float cloudEdge = pow(1.0 - cloudNdv, 3.0);
float cloudMod = mix(cloudNoise, 1.0, cloudEdge);
float cloudNdl = dot(normalize(vNormal), normalize(vec3(-0.9, 0.18, 0.4)));
float cloudDay = 1.0 - smoothstep(0.30, -0.30, cloudNdl) * 0.9;
gl_FragColor.a *= cloudMod * uOpacity * cloudDay;
`

type Uniforms = Record<string, THREE.IUniform>

function tagLayers(obj: THREE.Object3D, bloom = false) {
  obj.traverse((o) => {
    o.layers.enable(LAYERS.ENTIRE_SCENE)
    if (bloom) o.layers.enable(LAYERS.BLOOM_SCENE)
  })
}

/** Mounts the fixed planet scene on `canvas`. Returns a cleanup function. */
export function mountPlanet(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean; onReady?: () => void }) {
  let disposed = false
  const W = () => window.innerWidth
  const H = () => window.innerHeight

  const renderer = new THREE.WebGL1Renderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W(), H(), false)
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 200)
  camera.position.set(0, 0, 8)
  camera.layers.enable(LAYERS.TORUS_SCENE)
  camera.layers.enable(LAYERS.BLOOM_SCENE)
  camera.layers.enable(LAYERS.ENTIRE_SCENE)
  scene.add(camera)

  const ambient = new THREE.AmbientLight(0xffffff, 1.8)
  ambient.layers.set(LAYERS.ENTIRE_SCENE)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 0.8)
  dir.position.set(0, 10, 2)
  dir.layers.set(LAYERS.ENTIRE_SCENE)
  scene.add(dir)

  const size = new THREE.Vector2(W(), H())
  const torusComposer = new EffectComposer(renderer)
  torusComposer.renderToScreen = false
  torusComposer.addPass(new RenderPass(scene, camera))
  torusComposer.addPass(new ShaderPass(GammaCorrectionShader))
  torusComposer.addPass(new UnrealBloomPass(size, 0.22, 0.2, 0))
  torusComposer.addPass(new ShaderPass(CopyShader))

  const bloomComposer = new EffectComposer(renderer)
  bloomComposer.renderToScreen = false
  bloomComposer.addPass(new RenderPass(scene, camera))
  bloomComposer.addPass(new UnrealBloomPass(size, 0.5, 0.6, 0))
  bloomComposer.addPass(new ShaderPass(GammaCorrectionShader))

  const FinalPass = {
    uniforms: {
      iTime: { value: 0 }, tDiffuse: { value: null }, torusTexture: { value: null }, bloomTexture: { value: null }, haloTexture: { value: null },
      uBg: { value: hexToVec3(CONFIG.bgColor) }, uFlameA: { value: hexToVec3(CONFIG.flameColor) },
      uFlameB: { value: hexToVec3(CONFIG.flameColor2) }, uFlameAmt: { value: CONFIG.flameAmt },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: `
    uniform float iTime; uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; uniform sampler2D torusTexture; uniform sampler2D haloTexture;
    uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
    varying vec2 vUv;
    vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
      pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x);
      pos.y+=curv*sin(t+a*pos.z)+t*b; pos.z+=curv*cos(t+a*pos.y);
      pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
      return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
    void main(){
      vec2 uv = 2.*vUv - 1.;
      vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
      vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
      flame *= smoothstep(0.25, 1., abs(uv.y));
      float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
      vec3 bg = uBg * (1.0 - 0.4 * length(uv));
      vec3 halo = texture2D(haloTexture, vUv).xyz;
      gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(bloomTexture, vUv).xyz + texture2D(torusTexture, vUv).xyz + texture2D(tDiffuse, vUv).xyz + halo, 1.);
    }`,
  }
  const finalComposer = new EffectComposer(renderer)
  finalComposer.addPass(new RenderPass(scene, camera))
  const finalPass = new ShaderPass(FinalPass)
  finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget1.texture
  finalPass.uniforms.torusTexture.value = torusComposer.renderTarget1.texture
  finalComposer.addPass(finalPass)

  const worldGroup = new THREE.Group()
  const planetGroup = new THREE.Group()
  planetGroup.rotation.z = CONFIG.tilt
  const cloudGroup = new THREE.Group()
  cloudGroup.rotation.z = CONFIG.tilt
  cloudGroup.visible = false
  worldGroup.add(planetGroup, cloudGroup)
  worldGroup.position.set(STOPS_X[0].v, STOPS_Y[0].v, 0)
  worldGroup.scale.setScalar(STOPS_S[0].v)
  scene.add(worldGroup)

  const glowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { uGlow: { value: hexToVec3(CONFIG.glowColor) }, uIntensity: { value: CONFIG.glowIntensity } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uGlow; uniform float uIntensity; varying vec2 vUv;
        void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2); gl_FragColor = vec4(uGlow * a * uIntensity, a); }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  )
  glowMesh.scale.setScalar(CONFIG.planetRadius * 2.3)
  worldGroup.add(glowMesh)
  tagLayers(glowMesh)

  // Ambient motes
  const res = new THREE.Vector2(W(), H())
  const atmoGeo = new THREE.BufferGeometry()
  {
    const n = CONFIG.atmoCount
    const pos = new Float32Array(n * 3)
    const sz = new Float32Array(n)
    const sd = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * 2 - 1
      pos[i * 3 + 1] = Math.random() * 2 - 1
      pos[i * 3 + 2] = Math.random() * 2 - 1
      sz[i] = CONFIG.atmoSize * (0.4 + Math.random())
      sd[i] = Math.random()
    }
    atmoGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    atmoGeo.setAttribute('size', new THREE.BufferAttribute(sz, 1))
    atmoGeo.setAttribute('seed', new THREE.BufferAttribute(sd, 1))
  }
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRes: { value: res }, uColor: { value: new THREE.Color(CONFIG.atmoColor) } },
    vertexShader: `attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes;
      varying float vA;
      vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
        p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
        p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z);
        return cos(p+vec3(1,2,4)); }
      void main(){
        vec3 v = position*4.0 + warp(position, uTime)*1.2;
        vec4 mv = modelViewMatrix * vec4(v, 1.0);
        float r = length(v); float farF = 1.0 - smoothstep(5.0, 6.5, r); float nearF = smoothstep(0.0, 0.5, -mv.z);
        vA = farF * nearF;
        gl_PointSize = size * uRes.y / 900.0 / -mv.z; gl_PointSize = max(gl_PointSize, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
        float tex = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor * tex, tex * vA * 0.55); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  })
  const atmo = new THREE.Points(atmoGeo, atmoMat)
  atmo.frustumCulled = false
  atmo.onBeforeRender = () => {
    const now = performance.now() / 1000
    atmoMat.uniforms.uTime.value = now * CONFIG.atmoSpeed * 8
    atmo.position.copy(camera.position)
    finalPass.uniforms.iTime.value = now
  }
  scene.add(atmo)
  tagLayers(atmo)

  // Starfield
  const starGeo = new THREE.BufferGeometry()
  {
    const n = CONFIG.starCount
    const pos = new Float32Array(n * 3)
    const sd = new Float32Array(n)
    const br = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      pos[i * 3] = 90 * s * Math.cos(th)
      pos[i * 3 + 1] = 90 * s * Math.sin(th)
      pos[i * 3 + 2] = 90 * u
      sd[i] = Math.random() * 100
      br[i] = 0.35 + Math.random() * 0.65
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    starGeo.setAttribute('seed', new THREE.BufferAttribute(sd, 1))
    starGeo.setAttribute('bright', new THREE.BufferAttribute(br, 1))
  }
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSize: { value: CONFIG.starSize }, uFlicker: { value: CONFIG.starFlicker },
      uColor: { value: new THREE.Color(CONFIG.starColor) }, uRes: { value: res },
    },
    vertexShader: `attribute float seed; attribute float bright;
      uniform float uTime; uniform float uSize; uniform float uFlicker; uniform vec2 uRes;
      varying float vTw;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.6 + 0.4 * sin(uTime * uFlicker + seed);
        vTw = bright * tw;
        gl_PointSize = max(uSize * uRes.y / 900.0 * (90.0 / max(-mv.z, 1.0)), 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vTw;
      void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
        float core = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor, core * vTw); }`,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  })
  const stars = new THREE.Points(starGeo, starMat)
  stars.frustumCulled = false
  scene.add(stars)
  tagLayers(stars, true)

  const planetTime = { value: 0 }
  const cloudTime = { value: 0 }
  const markerUniforms: Uniforms = {
    uTime: { value: 0 }, uColor: { value: new THREE.Color(CONFIG.markerColor) },
    uSize: { value: CONFIG.markerSize }, uSpeed: { value: CONFIG.markerSpeed }, uRes: { value: res },
  }
  const cloudMeshes: { mesh: THREE.Mesh; spin: number }[] = []
  let loaded = false
  let loadedAt = 0

  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
  const gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(draco)

  const firstMesh = (root: THREE.Object3D) => {
    let found: THREE.Mesh | null = null
    root.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh
    })
    return found as THREE.Mesh | null
  }

  gltfLoader.load(PLANET_LIGHTS_GLB, (lightsGltf) => {
    if (disposed) return
    const lm = firstMesh(lightsGltf.scene)
    const nightTex = (lm?.material as THREE.MeshStandardMaterial | undefined)?.map ?? null
    gltfLoader.load(PLANET_GLB, (gltf) => {
      if (disposed) return
      const mesh = firstMesh(gltf.scene)
      if (!mesh) return
      mesh.geometry.computeBoundingSphere()
      const r = mesh.geometry.boundingSphere?.radius ?? 1
      mesh.scale.setScalar(CONFIG.planetRadius / r)
      mesh.position.set(0, 0, 0)
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
      mat.metalness = 0
      mat.roughness = 1
      mat.envMapIntensity = 0
      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, {
          time: planetTime, noiseScale: { value: 30 }, speedX: { value: 1.5 }, speedY: { value: 2.0 }, speedZ: { value: 2.5 },
          rimColor: { value: new THREE.Color(CONFIG.rimColor) }, rimPower: { value: CONFIG.rimPower },
          nightBlendTexture: { value: nightTex }, nightLights: { value: CONFIG.nightLights },
          terrainDepth: { value: CONFIG.terrainDepth }, terrainShade: { value: CONFIG.terrainShade },
          oceanGlint: { value: CONFIG.oceanGlint }, oceanDeep: { value: CONFIG.oceanDeep },
          oceanFlow: { value: CONFIG.oceanFlow }, oceanFlowSpeed: { value: CONFIG.oceanFlowSpeed }, oceanFlowScale: { value: CONFIG.oceanFlowScale },
        })
        shader.vertexShader = `varying vec2 vCustomUv;\n${shader.vertexShader}`.replace('void main() {', 'void main() {\n  vCustomUv = uv;')
        shader.fragmentShader =
          `uniform float time; uniform float noiseScale; uniform float speedX; uniform float speedY; uniform float speedZ;
uniform vec3 rimColor; uniform float rimPower; uniform sampler2D nightBlendTexture; uniform float nightLights;
uniform float terrainDepth; uniform float terrainShade; uniform float oceanGlint; uniform float oceanDeep;
uniform float oceanFlow; uniform float oceanFlowSpeed; uniform float oceanFlowScale;
varying vec2 vCustomUv;
${SNOISE}
${shader.fragmentShader}`.replace('#include <dithering_fragment>', PLANET_INJECT)
      }
      mesh.material = mat
      planetGroup.add(mesh)
      tagLayers(mesh)
      addMarkers(mesh, mat.map)
      loaded = true
      loadedAt = performance.now() / 1000
      cloudGroup.visible = true
      opts.onReady?.()
    })
  })

  new THREE.TextureLoader().load(PLANET_CLOUDS_PNG, (tex) => {
    if (disposed) return
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(5, 5)
    const layers = [
      { h: CONFIG.cloud1Height, o: CONFIG.cloud1Opacity, s: CONFIG.cloud1Spin, ry: 0.0, phase: 0.0 },
      { h: CONFIG.cloud2Height, o: CONFIG.cloud2Opacity, s: CONFIG.cloud2Spin, ry: 2.2, phase: 13.0 },
      { h: CONFIG.cloud3Height, o: CONFIG.cloud3Opacity, s: CONFIG.cloud3Spin, ry: 4.3, phase: 27.0 },
    ]
    for (const layer of layers) {
      const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false })
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, {
          uTime: cloudTime, noiseScale: { value: 20 }, uSpeedX: { value: 1 }, uSpeedY: { value: 2 }, uSpeedZ: { value: 2 },
          uOpacity: { value: layer.o }, uPhase: { value: layer.phase },
        })
        shader.vertexShader = `varying vec2 vCloudUv;\n${shader.vertexShader}`.replace('void main() {', 'void main() {\n  vCloudUv = uv;')
        shader.fragmentShader =
          `uniform float uTime; uniform float noiseScale; uniform float uSpeedX; uniform float uSpeedY; uniform float uSpeedZ;
uniform float uOpacity; uniform float uPhase; varying vec2 vCloudUv;
${SNOISE}
${shader.fragmentShader}`.replace('#include <dithering_fragment>', CLOUD_INJECT)
      }
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(CONFIG.planetRadius * layer.h, 64, 64), m)
      mesh.rotation.y = layer.ry
      mesh.renderOrder = 2
      cloudGroup.add(mesh)
      tagLayers(mesh)
      cloudMeshes.push({ mesh, spin: layer.s })
    }
  })

  function addMarkers(mesh: THREE.Mesh, map: THREE.Texture | null) {
    const img = map?.image as (CanvasImageSource & { width: number; height: number }) | undefined
    const geo = mesh.geometry
    const posAttr = geo.getAttribute('position')
    const uvAttr = geo.getAttribute('uv')
    if (!img || !posAttr || !uvAttr) return
    let data: Uint8ClampedArray
    const cw = img.width
    const ch = img.height
    try {
      const c = document.createElement('canvas')
      c.width = cw
      c.height = ch
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      data = ctx.getImageData(0, 0, cw, ch).data
    } catch {
      return
    }
    const index = geo.getIndex()
    const triCount = index ? index.count / 3 : posAttr.count / 3
    const vi = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k)
    const cum = new Float32Array(triCount)
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c3 = new THREE.Vector3()
    let total = 0
    for (let t = 0; t < triCount; t++) {
      a.fromBufferAttribute(posAttr, vi(t, 0))
      b.fromBufferAttribute(posAttr, vi(t, 1))
      c3.fromBufferAttribute(posAttr, vi(t, 2))
      total += b.clone().sub(a).cross(c3.clone().sub(a)).length() * 0.5
      cum[t] = total
    }
    const out: number[] = []
    const seeds: number[] = []
    let guard = 0
    while (seeds.length < CONFIG.markerCount && guard++ < 20000) {
      const r = Math.random() * total
      let lo = 0
      let hi = triCount - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cum[mid] < r) lo = mid + 1
        else hi = mid
      }
      let u = Math.random()
      let v = Math.random()
      if (u + v > 1) {
        u = 1 - u
        v = 1 - v
      }
      const w = 1 - u - v
      const i0 = vi(lo, 0)
      const i1 = vi(lo, 1)
      const i2 = vi(lo, 2)
      const tu = uvAttr.getX(i0) * w + uvAttr.getX(i1) * u + uvAttr.getX(i2) * v
      const tv = uvAttr.getY(i0) * w + uvAttr.getY(i1) * u + uvAttr.getY(i2) * v
      const px = clamp(Math.floor(tu * cw), 0, cw - 1)
      const py = clamp(Math.floor((map!.flipY ? 1 - tv : tv) * ch), 0, ch - 1)
      const o = (py * cw + px) * 4
      const cr = data[o]
      const cg = data[o + 1]
      const cb = data[o + 2]
      if (cb > cr + 6 && cb > cg + 6) continue
      a.fromBufferAttribute(posAttr, i0).multiplyScalar(w)
      b.fromBufferAttribute(posAttr, i1).multiplyScalar(u)
      c3.fromBufferAttribute(posAttr, i2).multiplyScalar(v)
      const p = a.add(b).add(c3).multiplyScalar(1.012)
      out.push(p.x, p.y, p.z)
      seeds.push(Math.random())
    }
    const mg = new THREE.BufferGeometry()
    mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(out), 3))
    mg.setAttribute('seed', new THREE.BufferAttribute(new Float32Array(seeds), 1))
    const mm = new THREE.ShaderMaterial({
      uniforms: markerUniforms,
      vertexShader: `attribute float seed; uniform float uSize; uniform vec2 uRes;
        varying float vSeed; varying float vFade;
        void main(){
          vSeed = seed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 vn = normalize(normalMatrix * normalize(position));
          vec3 vd = normalize(-mv.xyz);
          vFade = smoothstep(0.15, 0.5, dot(vn, vd));
          gl_PointSize = max(uSize * uRes.y / 900.0 * (7.0 / max(-mv.z, 1.0)), 2.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uSpeed;
        varying float vSeed; varying float vFade;
        void main(){
          if (vFade <= 0.001) discard;
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p) * 2.0;
          if (d > 1.0) discard;
          float core = smoothstep(0.30, 0.0, d) * 1.2;
          float ph = fract(uTime * uSpeed + vSeed);
          float ring = smoothstep(0.07, 0.0, abs(d - ph)) * (1.0 - ph);
          gl_FragColor = vec4(uColor, clamp(core + ring, 0.0, 1.0) * vFade);
        }`,
      transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    const pts = new THREE.Points(mg, mm)
    pts.frustumCulled = false
    mesh.add(pts)
    tagLayers(pts, true)
  }

  let curP = 0
  let curX = STOPS_X[0].v
  let curY = STOPS_Y[0].v
  let curS = STOPS_S[0].v
  let spinPhase = 0
  let last = performance.now()
  let raf = 0
  const ENTRY_DUR = 1.9
  const ENTRY_START_Y = -6.5

  function frame() {
    raf = requestAnimationFrame(frame)
    const nowMs = performance.now()
    const dt = Math.min((nowMs - last) / 1000, 0.05)
    last = nowMs

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const pTarget = clamp(maxScroll > 0 ? window.scrollY / maxScroll : 0, 0, 1)
    curP += (pTarget - curP) * Math.min(1, dt * 4.5)
    const sideScale = clamp(window.innerWidth / 1200, 0.5, 1)
    const k = Math.min(1, dt * 3.2)
    curX += (sample(STOPS_X, curP) * sideScale - curX) * k
    curY += (sample(STOPS_Y, curP) - curY) * k
    curS += (sample(STOPS_S, curP) - curS) * k

    let entryY = 0
    if (loaded && !opts.reducedMotion) {
      const t = clamp((nowMs / 1000 - loadedAt) / ENTRY_DUR, 0, 1)
      entryY = ENTRY_START_Y * (1 - (1 - Math.pow(1 - t, 3)))
    }
    worldGroup.position.set(curX, curY + entryY, 0)
    worldGroup.scale.setScalar(curS)

    spinPhase += dt * CONFIG.spin
    planetGroup.rotation.y = CONFIG.initRotation + spinPhase + curP * Math.PI * 1.6
    for (const c of cloudMeshes) c.mesh.rotation.y += dt * c.spin
    glowMesh.quaternion.copy(camera.quaternion)

    planetTime.value += dt / 12
    cloudTime.value += dt / 20
    starMat.uniforms.uTime.value += dt
    markerUniforms.uTime.value += dt

    camera.layers.set(LAYERS.TORUS_SCENE)
    torusComposer.render()
    camera.layers.set(LAYERS.BLOOM_SCENE)
    bloomComposer.render()
    camera.layers.set(LAYERS.ENTIRE_SCENE)
    finalComposer.render()
  }
  raf = requestAnimationFrame(frame)

  function onResize() {
    const w = W()
    const h = H()
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    const pr = Math.min(window.devicePixelRatio, 2)
    for (const comp of [torusComposer, bloomComposer, finalComposer]) {
      comp.setPixelRatio(pr)
      comp.setSize(w, h)
    }
    res.set(w, h)
  }
  window.addEventListener('resize', onResize)

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    draco.dispose()
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose?.()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose?.()
    })
    renderer.dispose()
  }
}
