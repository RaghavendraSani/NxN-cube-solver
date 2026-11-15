import type { FaceletAddress } from '../cube/coordinates';
import { FACES } from '../cube/faces';
import { toNxNCoordinates } from '../nxn/cube';

type Piece = readonly FaceletAddress[];
type PieceGroups = {
  fixedCenters: Piece[];
  xCenters: Piece[];
  tCenters: Piece[];
  middleEdges: Piece[];
  wings: Piece[];
  corners: Piece[];
};

/** Group the 150 stickers by cubie position and distinguish the 5×5 piece orbits. */
export function pieces5(): PieceGroups {
  const byPosition = new Map<string, FaceletAddress[]>();
  for (const face of FACES)
    for (let row = 0; row < 5; row++)
      for (let column = 0; column < 5; column++) {
        const address = { face, row, column };
        const key = toNxNCoordinates(address, 5).position.join(',');
        const piece = byPosition.get(key) ?? [];
        piece.push(address);
        byPosition.set(key, piece);
      }

  const groups: PieceGroups = {
    fixedCenters: [],
    xCenters: [],
    tCenters: [],
    middleEdges: [],
    wings: [],
    corners: [],
  };
  for (const piece of byPosition.values()) {
    if (piece.length === 3) groups.corners.push(piece);
    else if (piece.length === 2) {
      const position = toNxNCoordinates(piece[0], 5).position;
      (position.includes(0) ? groups.middleEdges : groups.wings).push(piece);
    } else {
      const { row, column } = piece[0];
      const centeredCoordinates = Number(row === 2) + Number(column === 2);
      (centeredCoordinates === 2
        ? groups.fixedCenters
        : centeredCoordinates === 1
          ? groups.tCenters
          : groups.xCenters
      ).push(piece);
    }
  }
  return groups;
}
