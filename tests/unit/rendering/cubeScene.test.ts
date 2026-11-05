// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { createCubeScene } from '../../../src/rendering/cubeScene';
import { faceletToCoordinates } from '../../../src/domain/cube/coordinates';
import { pickFacelet } from '../../../src/rendering/pickFacelet';

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
});
