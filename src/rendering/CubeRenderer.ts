import { PerspectiveCamera, Raycaster, Scene, Vector2, WebGLRenderer } from 'three';
import type { FaceletAddress } from '../domain/cube/coordinates';
import { createCubeScene } from './cubeScene';
import { pickFacelet } from './pickFacelet';

export class CubeRenderer {
  private readonly renderer = new WebGLRenderer({ antialias: true });
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(35, 1, 0.1, 100);
  private readonly cube = createCubeScene();
  private readonly raycaster = new Raycaster();
  private readonly observer: ResizeObserver;

  constructor(
    private readonly container: HTMLElement,
    private readonly onSelect: (address: FaceletAddress) => void,
  ) {
    this.camera.position.set(6, 6, 6);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.cube.group);
    this.renderer.setClearColor(0xdddddd);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D cube');
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointer);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }

  private resize() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.render(this.scene, this.camera);
  }

  private readonly handlePointer = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const address = pickFacelet(this.raycaster, this.cube.facelets);
    if (address) this.onSelect(address);
  };

  dispose() {
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointer);
    this.cube.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
