// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { createCubeScene } from '../../../src/rendering/cubeScene';
import { toNxNCoordinates } from '../../../src/domain/nxn/cube';
import { createUnassignedCube } from '../../../src/domain/cube/state';
import { paintFacelet } from '../../../src/domain/cube/inputState';

function pickingCamera() {
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(6, 6, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

describe('cube facelet picking', () => {
  it.each([3, 4, 7, 20])('maps every visible facelet center on a %i-layer cube', (size) => {
    const scene = createCubeScene(size);
    const camera = pickingCamera();
    scene.group.updateMatrixWorld(true);
    const raycaster = new Raycaster();
    for (const face of ['U', 'R', 'F'] as const)
      for (let row = 0; row < size; row++)
        for (let column = 0; column < size; column++) {
          const address = { face, row, column };
          const { position, normal } = toNxNCoordinates(address, size);
          const point = new Vector3(...position)
            .multiplyScalar(3 / size / 2)
            .addScaledVector(new Vector3(...normal), (0.51 * 3) / size)
            .project(camera);
          raycaster.setFromCamera(new Vector2(point.x, point.y), camera);
          expect(scene.pick(raycaster)).toEqual(address);
        }
    scene.dispose();
  });

  it('marks unassigned facelets and hides the mark for assigned white', () => {
    const scene = createCubeScene();
    const state = createUnassignedCube();
    scene.setState(state);
    expect(scene.isMarked({ face: 'U', row: 0, column: 0 })).toBe(true);
    scene.setState(paintFacelet(state, { face: 'U', row: 0, column: 0 }, 'white'));
    expect(scene.isMarked({ face: 'U', row: 0, column: 0 })).toBe(false);
    expect(scene.isMarked({ face: 'U', row: 0, column: 1 })).toBe(true);
    scene.dispose();
  });

  it('retains canonical addresses after rotating the whole cube', () => {
    const scene = createCubeScene();
    const camera = pickingCamera();
    scene.group.quaternion.copy(
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
    );
    scene.group.updateMatrixWorld(true);
    const address = { face: 'L', row: 1, column: 1 } as const;
    const { position, normal } = toNxNCoordinates(address, 3);
    const point = new Vector3(...position)
      .multiplyScalar(0.5)
      .addScaledVector(new Vector3(...normal), 0.51);
    point.applyQuaternion(scene.group.quaternion).project(camera);
    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(point.x, point.y), camera);
    expect(scene.pick(raycaster)).toEqual(address);
    scene.dispose();
  });

  it('keeps painted facelets through four view rotations', () => {
    const scene = createCubeScene();
    const address = { face: 'F', row: 0, column: 0 } as const;
    const state = paintFacelet(createUnassignedCube(), address, 'red');
    scene.setState(state);
    const quarterTurn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    for (let i = 0; i < 4; i++) scene.group.quaternion.premultiply(quarterTurn).normalize();
    expect(Math.abs(scene.group.quaternion.dot(new Quaternion()))).toBeCloseTo(1);
    expect(scene.stickerColor(address)).toBe(0xd22630);
    scene.dispose();
  });
});

describe('scene cost', () => {
  it.each([3, 8, 20])('uses a fixed number of draw objects on a %i-layer cube', (size) => {
    const scene = createCubeScene(size);
    // Core, bodies, stickers, markers, and highlights, whatever the cube size.
    expect(scene.group.children).toHaveLength(5);
    const bodies = scene.group.children[1] as unknown as { count: number };
    expect(bodies.count).toBe(size ** 3 - (size - 2) ** 3);
    scene.dispose();
  });
});
