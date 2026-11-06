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
  const bodyGeometry = new BoxGeometry(3, 3, 3);
  const bodyMaterial = new MeshBasicMaterial({ color: 0x151515 });
  group.add(new Mesh(bodyGeometry, bodyMaterial));
  const stickerGeometry = new PlaneGeometry(0.9, 0.9);
  const materials = Object.fromEntries(
    Object.entries(COLOR_VALUES).map(([key, color]) => [key, new MeshBasicMaterial({ color })]),
  ) as Record<Color, MeshBasicMaterial>;
  const facelets: Mesh[] = [];
  const markerGeometry = new CircleGeometry(0.06, 16);
  const markerMaterial = new MeshBasicMaterial({ color: 0x777777 });
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
        group.add(sticker);
        facelets.push(sticker);
      }
    }
  }
  return {
    group,
    facelets,
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
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
