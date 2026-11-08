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
import { faceletToCoordinates, type FaceletAddress } from '../domain/cube/coordinates';
import { FACES } from '../domain/cube/faces';
import type { CubeState } from '../domain/cube/types';
import type { Color } from '../domain/cube/colors';
import type { Move } from '../domain/cube/moves';
import type { Face } from '../domain/cube/faces';

const COLOR_VALUES: Record<Color, number> = {
  red: 0xd22630,
  blue: 0x3777db,
  yellow: 0xffdc00,
  green: 0x27bd2c,
  white: 0xffffff,
  orange: 0xff7900,
  unassigned: 0xffffff,
};

export function createCubeScene() {
  const group = new Group();
  const bodyGeometry = new BoxGeometry(0.98, 0.98, 0.98);
  const bodyMaterial = new MeshBasicMaterial({ color: 0x151515 });
  const cubies: Mesh[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const cubie = new Mesh(bodyGeometry, bodyMaterial);
        cubie.position.set(x, y, z);
        group.add(cubie);
        cubies.push(cubie);
      }
  const stickerGeometry = new PlaneGeometry(0.9, 0.9);
  const materials = Object.fromEntries(
    Object.entries(COLOR_VALUES).map(([key, color]) => [key, new MeshBasicMaterial({ color })]),
  ) as Record<Color, MeshBasicMaterial>;
  const facelets: Mesh[] = [];
  const markerGeometry = new CircleGeometry(0.06, 16);
  const markerMaterial = new MeshBasicMaterial({ color: 0x777777 });
  const highlightMaterial = new MeshBasicMaterial({
    color: 0xffcf00,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  for (const face of FACES) {
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        const address: FaceletAddress = { face, row, column };
        const { position, normal } = faceletToCoordinates(address);
        const sticker = new Mesh(stickerGeometry, materials.unassigned);
        const outward = new Vector3(...normal);
        sticker.position.set(...position).addScaledVector(outward, 0.51);
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
    setHighlight(face: Face | null) {
      const axis =
        face === null
          ? null
          : new Vector3(...faceletToCoordinates({ face, row: 1, column: 1 }).normal);
      for (const sticker of facelets) {
        const { position } = faceletToCoordinates(sticker.userData.address as FaceletAddress);
        sticker.children[1].visible = axis !== null && new Vector3(...position).dot(axis) === 1;
      }
    },
    beginLayerTurn(move: Move) {
      const { normal } = faceletToCoordinates({ face: move.face, row: 1, column: 1 });
      const axis = new Vector3(...normal);
      const pivot = new Group();
      group.add(pivot);
      const selected = [...cubies, ...facelets].filter((object) => {
        if (object.userData.address) {
          const position = faceletToCoordinates(object.userData.address as FaceletAddress).position;
          return new Vector3(...position).dot(axis) === 1;
        }
        return object.position.dot(axis) === 1;
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
        sticker.material = materials[state[face][row * 3 + column]];
        sticker.children[0].visible = state[face][row * 3 + column] === 'unassigned';
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
