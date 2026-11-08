import {
  BoxGeometry,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { FACE_BASIS, type FaceletAddress } from '../domain/cube/coordinates';
import { FACES } from '../domain/cube/faces';
import type { CubeState } from '../domain/cube/types';
import type { Color } from '../domain/cube/colors';
import type { Move } from '../domain/cube/moves';
import type { Face } from '../domain/cube/faces';
import { toNxNCoordinates, type LayerMove } from '../domain/nxn/cube';

const COLOR_VALUES: Record<Color, number> = {
  red: 0xd22630,
  blue: 0x3777db,
  yellow: 0xffdc00,
  green: 0x27bd2c,
  white: 0xffffff,
  orange: 0xff7900,
  unassigned: 0xffffff,
};

export function createCubeScene(size = 3) {
  const group = new Group();
  const step = 3 / size;
  const bodyGeometry = new BoxGeometry(0.98 * step, 0.98 * step, 0.98 * step);
  const bodyMaterial = new MeshBasicMaterial({ color: 0x151515 });
  const cubies: Mesh[] = [];
  for (let x = 0; x < size; x++)
    for (let y = 0; y < size; y++)
      for (let z = 0; z < size; z++) {
        const cubie = new Mesh(bodyGeometry, bodyMaterial);
        cubie.position.set(
          (x - (size - 1) / 2) * step,
          (y - (size - 1) / 2) * step,
          (z - (size - 1) / 2) * step,
        );
        group.add(cubie);
        cubies.push(cubie);
      }
  const stickerGeometry = new PlaneGeometry(0.9 * step, 0.9 * step);
  const materials = Object.fromEntries(
    Object.entries(COLOR_VALUES).map(([key, color]) => [key, new MeshBasicMaterial({ color })]),
  ) as Record<Color, MeshBasicMaterial>;
  const facelets: Mesh[] = [];
  const markerGeometry = new CircleGeometry(0.06 * step, 16);
  const markerMaterial = new MeshBasicMaterial({ color: 0x777777 });
  const highlightMaterial = new MeshBasicMaterial({
    color: 0xffcf00,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  for (const face of FACES) {
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        const address: FaceletAddress = { face, row, column };
        const { position, normal } = toNxNCoordinates(address, size);
        const sticker = new Mesh(stickerGeometry, materials.unassigned);
        const outward = new Vector3(...normal);
        sticker.position
          .set(...position)
          .multiplyScalar(step / 2)
          .addScaledVector(outward, 0.51 * step);
        sticker.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), outward));
        sticker.userData.address = address;
        const marker = new Mesh(markerGeometry, markerMaterial);
        marker.position.z = 0.002;
        marker.raycast = () => {};
        sticker.add(marker);
        const highlight = new Mesh(stickerGeometry, highlightMaterial);
        highlight.position.z = 0.003;
        highlight.visible = false;
        highlight.raycast = () => {};
        sticker.add(highlight);
        group.add(sticker);
        facelets.push(sticker);
      }
    }
  }
  return {
    group,
    facelets,
    setHighlight(face: Face | null, layer = 0, width = 1) {
      const axis = face === null ? null : new Vector3(...FACE_BASIS[face][0]);
      for (const sticker of facelets) {
        const { position } = toNxNCoordinates(sticker.userData.address as FaceletAddress, size);
        const index = axis === null ? -1 : (size - 1 - new Vector3(...position).dot(axis)) / 2;
        sticker.children[1].visible = axis !== null && index >= layer && index < layer + width;
      }
    },
    beginLayerTurn(move: Move | LayerMove) {
      const normal = FACE_BASIS[move.face][0];
      const axis = new Vector3(...normal);
      const layer = 'layer' in move ? move.layer : 0;
      const width = 'width' in move ? move.width : 1;
      if (
        !Number.isInteger(layer) ||
        !Number.isInteger(width) ||
        layer < 0 ||
        width < 1 ||
        layer + width > size
      )
        throw new RangeError('Invalid animation layer.');
      const pivot = new Group();
      group.add(pivot);
      const selected = [...cubies, ...facelets].filter((object) => {
        if (object.userData.address) {
          const position = toNxNCoordinates(
            object.userData.address as FaceletAddress,
            size,
          ).position;
          const index = (size - 1 - new Vector3(...position).dot(axis)) / 2;
          return index >= layer && index < layer + width;
        }
        const index = Math.round((size - 1) / 2 - object.position.dot(axis) / step);
        return index >= layer && index < layer + width;
      });
      const originals = selected.map((object) => ({
        object,
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
      }));
      selected.forEach((object) => pivot.add(object));
      return {
        setProgress(progress: number) {
          pivot.quaternion.setFromAxisAngle(axis, (-move.turns * Math.PI * progress) / 2);
        },
        finish() {
          for (const { object, position, quaternion } of originals) {
            group.add(object);
            object.position.copy(position);
            object.quaternion.copy(quaternion);
          }
          group.remove(pivot);
        },
      };
    },
    setState(state: CubeState) {
      for (const sticker of facelets) {
        const { face, row, column } = sticker.userData.address as FaceletAddress;
        sticker.material = materials[state[face][row * size + column]];
        sticker.children[0].visible = state[face][row * size + column] === 'unassigned';
      }
    },
    dispose() {
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      stickerGeometry.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      highlightMaterial.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
