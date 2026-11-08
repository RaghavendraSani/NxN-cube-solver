import {
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { FaceletAddress } from '../domain/cube/coordinates';
import type { CubeState } from '../domain/cube/types';
import type { Move } from '../domain/cube/moves';
import type { Face } from '../domain/cube/faces';
import { createCubeScene } from './cubeScene';
import { pickFacelet } from './pickFacelet';

export class CubeRenderer {
  private readonly renderer = new WebGLRenderer({ antialias: true });
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(35, 1, 0.1, 100);
  private readonly cube = createCubeScene();
  private readonly raycaster = new Raycaster();
  private readonly observer: ResizeObserver;
  private frame: number | null = null;

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
    if (this.frame !== null) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const address = pickFacelet(this.raycaster, this.cube.facelets);
    if (address) this.onSelect(address);
  };

  setState(state: CubeState) {
    this.cube.setState(state);
    this.renderer.render(this.scene, this.camera);
  }

  setHighlight(face: Face | null) {
    this.cube.setHighlight(face);
    this.renderer.render(this.scene, this.camera);
  }

  rotate(axis: 'x' | 'y', direction: 1 | -1, onComplete: () => void): boolean {
    if (this.frame !== null) return false;
    const start = this.cube.group.quaternion.clone();
    const rotation = new Quaternion().setFromAxisAngle(
      axis === 'x' ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0),
      (direction * Math.PI) / 2,
    );
    const target = rotation.multiply(start).normalize();
    const started = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - started) / 300, 1);
      this.cube.group.quaternion.slerpQuaternions(start, target, progress);
      this.renderer.render(this.scene, this.camera);
      if (progress < 1) this.frame = requestAnimationFrame(animate);
      else {
        this.frame = null;
        onComplete();
      }
    };
    this.frame = requestAnimationFrame(animate);
    return true;
  }

  animateMove(move: Move, duration: number, nextState: CubeState, onComplete: () => void): boolean {
    if (this.frame !== null) return false;
    const layer = this.cube.beginLayerTurn(move);
    const started = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      layer.setProgress(progress);
      if (progress < 1) {
        this.renderer.render(this.scene, this.camera);
        this.frame = requestAnimationFrame(animate);
      } else {
        layer.finish();
        this.cube.setState(nextState);
        this.renderer.render(this.scene, this.camera);
        this.frame = null;
        onComplete();
      }
    };
    this.frame = requestAnimationFrame(animate);
    return true;
  }

  dispose() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointer);
    this.cube.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
