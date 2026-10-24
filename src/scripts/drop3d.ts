// The 3D Drop Room: a glossy black podium engraved with today's date, the DITTO HUB mark
// extruded in brushed gold behind it, and today's featured products floating on top.
// Loaded only after first paint, and only on devices that can run it smoothly.
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  RepeatWrapping,
  Scene,
  SpotLight,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { bump, productWeights } from './dropmath';

export interface DropScene {
  render(progress: number, time: number): void;
  pointer(x: number, y: number): void;
  drag(dx: number): void;
  dispose(): void;
}

interface Options {
  date: string;
  mark: string;
  products: { cutout: string; model: string | null }[];
}

const GOLD = 0xd9b061;

function radialTexture(stops: [number, string][], size = 256): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

async function bandTexture(text: string): Promise<Texture> {
  try {
    await document.fonts.load('800 52px Unbounded');
  } catch {
    /* fall back to the system font */
  }
  const font = '800 52px Unbounded, "Arial Black", sans-serif';
  const unit = `${text}   ·   `.split('').join('\u200A');
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = font;
  const unitWidth = Math.ceil(probe.measureText(unit).width);
  const copies = Math.max(1, Math.round(2048 / unitWidth));
  const c = document.createElement('canvas');
  c.width = unitWidth * copies;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#f3d58c');
  grad.addColorStop(1, '#a87a2c');
  ctx.fillStyle = grad;
  for (let i = 0; i < copies; i++) ctx.fillText(unit, i * unitWidth, 66);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  // About 3 lines of text around the podium; a whole number keeps the seam invisible.
  t.repeat.set(Math.max(1, Math.round(6 / copies)), 1);
  return t;
}

async function buildEmblem(url: string, material: Material): Promise<Group> {
  const svg = (
    await fetch(url).then((r) => {
      if (!r.ok) throw new Error('mark missing');
      return r.text();
    })
  ).replace(/fill="url\([^)]*\)"/g, 'fill="#d9b061"');
  const data = new SVGLoader().parse(svg);
  const inner = new Group();
  const settings = { depth: 34, bevelEnabled: true, bevelThickness: 6, bevelSize: 4, bevelSegments: 5, curveSegments: 20 };
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      inner.add(new Mesh(new ExtrudeGeometry(shape, settings), material));
    }
  }
  const box = new Box3().setFromObject(inner);
  const center = box.getCenter(new Vector3());
  inner.position.set(-center.x, -center.y, -center.z);
  const pivot = new Group();
  pivot.add(inner);
  const s = 3.4 / (box.max.y - box.min.y);
  pivot.scale.set(s, -s, s);
  return pivot;
}

function dustCloud(count: number): Points {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 0.8 + Math.random() * 3.2;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -0.2 + Math.random() * 4.2;
    pos[i * 3 + 2] = Math.sin(a) * r - 0.6;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  const mat = new PointsMaterial({
    size: 0.045,
    map: radialTexture([
      [0, 'rgba(255,240,205,1)'],
      [0.4, 'rgba(243,213,140,0.6)'],
      [1, 'rgba(243,213,140,0)'],
    ], 64),
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  return new Points(geo, mat);
}

interface Item {
  group: Group;
  shadow: Mesh;
  setOpacity(v: number): void;
  spin: boolean;
}

async function productItem(p: Options['products'][number], loader: TextureLoader, anisotropy: number, shadowTex: Texture): Promise<Item> {
  const group = new Group();
  const shadow = new Mesh(
    new PlaneGeometry(2.1, 0.62),
    new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.006;

  if (p.model) {
    try {
      // Models from `npm run optimize:models` use Meshopt compression, so the decoder comes along.
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      ]);
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(p.model);
      const model = gltf.scene;
      const box = new Box3().setFromObject(model);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      model.position.sub(center);
      const scale = 2 / Math.max(size.x, size.y, size.z);
      const holder = new Group();
      holder.add(model);
      holder.scale.setScalar(scale);
      group.add(holder);
      const mats: Material[] = [];
      model.traverse((o: Object3D) => {
        const m = (o as Mesh).material as Material | Material[] | undefined;
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => mats.push(x));
      });
      return {
        group,
        shadow,
        spin: true,
        setOpacity(v) {
          mats.forEach((m) => {
            m.transparent = v < 0.999;
            m.opacity = v;
          });
          (shadow.material as MeshBasicMaterial).opacity = 0.8 * v;
        },
      };
    } catch {
      /* fall back to the cut-out photo */
    }
  }

  const map = await loader.loadAsync(p.cutout);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = anisotropy;
  const mat = new MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
  const card = new Mesh(new PlaneGeometry(2.5, 2.5), mat);
  group.add(card);
  return {
    group,
    shadow,
    spin: false,
    setOpacity(v) {
      mat.opacity = v;
      (shadow.material as MeshBasicMaterial).opacity = 0.8 * v;
    },
  };
}

export async function createDropScene(canvas: HTMLCanvasElement, opts: Options): Promise<DropScene> {
  let compact = canvas.clientWidth < 900;
  const renderer = new WebGLRenderer({ canvas, antialias: !compact, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.fog = new Fog(0x0a0a0b, 11, 24);
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.5;

  const camera = new PerspectiveCamera(30, 1, 0.1, 80);

  const hemi = new HemisphereLight(0xc8d0dc, 0x050505, 0.4);
  const key = new SpotLight(0xfff0d6, 120, 30, 0.55, 0.7, 2);
  key.position.set(3.5, 8, 6);
  key.target.position.set(0, 0.8, 0);
  const rim = new PointLight(0xf3d58c, 60, 16, 2);
  rim.position.set(-3.2, 3.4, -2.4);
  const rim2 = new PointLight(GOLD, 30, 12, 2);
  rim2.position.set(3.4, 1.4, -2);
  scene.add(hemi, key, key.target, rim, rim2);

  const gold = new MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.27, clearcoat: 0.4, clearcoatRoughness: 0.18 });
  const ringMat = new MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.2, emissive: GOLD, emissiveIntensity: 0.15 });
  const black = new MeshPhysicalMaterial({ color: 0x0b0b0d, metalness: 0.3, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1 });
  black.envMapIntensity = 0.32;

  const podium = new Mesh(new CylinderGeometry(1.75, 1.85, 0.46, 128, 1), black);
  podium.position.y = -0.23;
  const plinth = new Mesh(new CylinderGeometry(2.0, 2.06, 0.1, 128), black);
  plinth.position.y = -0.51;
  const ring = new Mesh(new TorusGeometry(1.75, 0.022, 16, 220), ringMat);
  ring.rotation.x = Math.PI / 2;
  const band = new Mesh(
    new CylinderGeometry(1.806, 1.846, 0.2, 160, 1, true),
    new MeshBasicMaterial({ map: await bandTexture(`DROP · ${opts.date}`), transparent: true, depthWrite: false, toneMapped: false })
  );
  band.position.y = -0.22;
  const floor = new Mesh(
    new CircleGeometry(7, 64),
    new MeshBasicMaterial({
      map: radialTexture([
        [0, 'rgba(217,176,97,0.26)'],
        [0.4, 'rgba(217,176,97,0.06)'],
        [1, 'rgba(0,0,0,0)'],
      ]),
      transparent: true,
      depthWrite: false,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.56;

  const glow = new Sprite(
    new SpriteMaterial({
      map: radialTexture([
        [0, 'rgba(243,213,140,0.5)'],
        [0.35, 'rgba(217,176,97,0.16)'],
        [1, 'rgba(0,0,0,0)'],
      ]),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  glow.scale.set(5.6, 5.6, 1);
  glow.position.set(0, 1.5, -1.6);

  const emblem = await buildEmblem(opts.mark, gold);
  emblem.position.set(0, 2.05, -3);

  const shadowTex = radialTexture([
    [0, 'rgba(0,0,0,0.75)'],
    [0.55, 'rgba(0,0,0,0.25)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  const loader = new TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const items = await Promise.all(opts.products.map((p) => productItem(p, loader, anisotropy, shadowTex)));

  const dust = dustCloud(compact ? 70 : 160);

  scene.add(podium, plinth, ring, band, floor, glow, emblem, dust);
  items.forEach((it) => scene.add(it.group, it.shadow));

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    compact = w < 900;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = compact ? 40 : 30;
    if (compact) camera.setViewOffset(w, h, 0, h * 0.17, w, h);
    else camera.setViewOffset(w, h, -w * 0.18, h * 0.03, w, h);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let pointerX = 0;
  let pointerY = 0;
  let px = 0;
  let py = 0;
  let dragYaw = 0;
  let dragVel = 0;
  let lastDrag = -1e9;

  return {
    render(p, t) {
      px += (pointerX - px) * 0.05;
      py += (pointerY - py) * 0.05;
      dragYaw += dragVel;
      dragVel *= 0.9;
      if (t - lastDrag > 3) dragYaw *= 0.985;

      const yaw = -0.4 + p * 0.95 + px * 0.14 + dragYaw + Math.sin(t * 0.16) * 0.05;
      // The key spotlight drifts toward the cursor, so the podium's gold catches the light where you point.
      key.position.x = 3.5 + px * 3.2;
      key.position.z = 6 - py * 1.6;
      const radius = compact ? 13.8 : 11;
      const camY = 2.4 + (0.5 - p) * 0.6 - py * 0.25;
      camera.position.set(Math.sin(yaw) * radius, camY, Math.cos(yaw) * radius);
      camera.lookAt(0, 1.45, 0);

      const w = productWeights(p);
      const face = Math.atan2(camera.position.x, camera.position.z);
      items.forEach((it, i) => {
        const v = w[i] ?? 0;
        const visible = v > 0.002;
        it.group.visible = visible;
        it.shadow.visible = visible;
        if (!visible) return;
        it.setOpacity(v);
        const lift = 1.25 + (v - 1) * 1.0 + Math.sin(t * 1.3 + i) * 0.05 * v;
        it.group.position.y = lift;
        it.group.scale.setScalar(0.8 + 0.2 * v);
        it.group.rotation.y = it.spin ? t * 0.5 : face + Math.sin(t * 0.7) * 0.06;
        it.shadow.scale.setScalar(0.85 + (1.6 - lift) * 0.2);
      });

      const flash = Math.max(bump(p, 0.5, 0.06), bump(p, 0.75, 0.06));
      ringMat.emissiveIntensity = 0.15 + flash * 1.8;
      (glow.material as SpriteMaterial).opacity = 0.8 + flash * 0.2;
      emblem.rotation.y = Math.sin(t * 0.32) * 0.5 + (p - 0.5) * 0.8;
      dust.rotation.y = t * 0.035;
      dust.position.y = Math.sin(t * 0.25) * 0.08;
      renderer.render(scene, camera);
    },
    pointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    drag(dx) {
      dragVel += dx * 0.0032;
      lastDrag = performance.now() / 1000;
    },
    dispose() {
      ro.disconnect();
      scene.traverse((o) => {
        const mesh = o as Mesh;
        mesh.geometry?.dispose?.();
        const m = mesh.material as Material | Material[] | undefined;
        (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => x.dispose());
      });
      env.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
