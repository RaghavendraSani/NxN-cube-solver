import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { faceletToCoordinates, type FaceletAddress } from '../domain/cube/coordinates';
import { FACES } from '../domain/cube/faces';

export function createCubeScene() {
  const group = new Group();
  const bodyGeometry = new BoxGeometry(3, 3, 3);
  const bodyMaterial = new MeshBasicMaterial({ color: 0x151515 });
  group.add(new Mesh(bodyGeometry, bodyMaterial));
  const stickerGeometry = new PlaneGeometry(0.9, 0.9);
  const stickerMaterial = new MeshBasicMaterial({ color: 0xffffff });
  const facelets: Mesh[] = [];
  for (const face of FACES) {
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        const address: FaceletAddress = { face, row, column };
        const { position, normal } = faceletToCoordinates(address);
        const sticker = new Mesh(stickerGeometry, stickerMaterial);
        const outward = new Vector3(...normal);
        sticker.position.set(...position).addScaledVector(outward, 0.51);
        sticker.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), outward));
        sticker.userData.address = address;
        group.add(sticker);
        facelets.push(sticker);
      }
    }
  }
  return {
    group,
    facelets,
    dispose() {
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      stickerGeometry.dispose();
      stickerMaterial.dispose();
    },
  };
}
