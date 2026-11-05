// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { createCubeScene } from '../../../src/rendering/cubeScene';
import { faceletToCoordinates } from '../../../src/domain/cube/coordinates';
import { pickFacelet } from '../../../src/rendering/pickFacelet';
import { createUnassignedCube } from '../../../src/domain/cube/state';
import { paintFacelet } from '../../../src/domain/cube/inputState';
import { MeshBasicMaterial } from 'three';

describe('cube facelet picking', () => {
  it('maps the center of every visible facelet to its canonical address', () => {
    const scene = createCubeScene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(6, 6, 6);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    scene.group.updateMatrixWorld(true);
    const raycaster = new Raycaster();
    for (const face of ['U', 'R', 'F'] as const) {
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
          const address = { face, row, column };
          const { position, normal } = faceletToCoordinates(address);
          const center = new Vector3(...position).addScaledVector(new Vector3(...normal), 0.51);
          const projected = center.project(camera);
          raycaster.setFromCamera(new Vector2(projected.x, projected.y), camera);
          expect(pickFacelet(raycaster, scene.facelets)).toEqual(address);
        }
      }
    }
    scene.dispose();
  });

  it('retains canonical addresses after rotating the whole cube', () => {
    const scene = createCubeScene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(6, 6, 6);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    scene.group.quaternion.copy(
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
    );
    scene.group.updateMatrixWorld(true);
    const address = { face: 'L', row: 1, column: 1 } as const;
    const { position, normal } = faceletToCoordinates(address);
    const point = new Vector3(...position).addScaledVector(new Vector3(...normal), 0.51);
    point.applyQuaternion(scene.group.quaternion).project(camera);
    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(point.x, point.y), camera);
    expect(pickFacelet(raycaster, scene.facelets)).toEqual(address);
    scene.dispose();
  });

  it('keeps painted facelets through four view rotations', () => {
    const scene = createCubeScene();
    const address = { face: 'F', row: 0, column: 0 } as const;
    const state = paintFacelet(createUnassignedCube(), address, 'red');
    scene.setState(state);
    const sticker = scene.facelets.find((mesh) => {
      const selected = mesh.userData.address;
      return selected.face === 'F' && selected.row === 0 && selected.column === 0;
    });
    const quarterTurn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    for (let i = 0; i < 4; i++) scene.group.quaternion.premultiply(quarterTurn).normalize();
    expect(Math.abs(scene.group.quaternion.dot(new Quaternion()))).toBeCloseTo(1);
    expect((sticker?.material as MeshBasicMaterial).color.getHex()).toBe(0xd22630);
    expect(state.F[0]).toBe('red');
    scene.dispose();
  });
});
