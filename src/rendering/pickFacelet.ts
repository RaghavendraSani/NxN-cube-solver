import { Mesh, Raycaster } from 'three';
import type { FaceletAddress } from '../domain/cube/coordinates';

export function pickFacelet(raycaster: Raycaster, facelets: Mesh[]): FaceletAddress | null {
  const hit = raycaster.intersectObjects(facelets)[0];
  return hit ? (hit.object.userData.address as FaceletAddress) : null;
}
