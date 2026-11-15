import { describe, it } from 'vitest';
import { applyNxNMove } from '../../../../src/domain/nxn/cube';
import { parseMove5 } from '../../../../src/domain/fiveByFive/notation';
import { pieces5 } from '../../../../src/domain/fiveByFive/pieces';
import { FACES } from '../../../../src/domain/cube/faces';
import { dot, FACE_BASIS, type Vector } from '../../../../src/domain/cube/coordinates';
import { toNxNCoordinates } from '../../../../src/domain/nxn/cube';

describe('wing handedness orbit check', () => {
  it('checks if left wings and right wings ever mix', () => {
    const pieces = pieces5();
    // Compute handedness for each wing
    function handedness(wing: typeof pieces.wings[0]) {
      const a = FACE_BASIS[wing[0].face][0];
      const b = FACE_BASIS[wing[1].face][0];
      const cross: Vector = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
      const position = toNxNCoordinates(wing[0], 5).position;
      return Math.sign(dot(cross, position));
    }

    const initialHandedness = pieces.wings.map(handedness);
    console.log('Positive handedness count:', initialHandedness.filter(h => h > 0).length);
    console.log('Negative handedness count:', initialHandedness.filter(h => h < 0).length);

    // Apply moves and check if any wing changes handedness
    for (const move of ['U', '2U', '3U', 'R', '2R', 'F', '2F']) {
      // Map each wing piece
      const cube: any = {};
      for (const face of FACES) cube[face] = Array(25).fill(null);
      pieces.wings.forEach((wing, idx) => {
        wing.forEach(addr => {
          cube[addr.face][addr.row * 5 + addr.column] = idx;
        });
      });
      const moved = applyNxNMove(cube, 5, parseMove5(move));
      for (let i = 0; i < pieces.wings.length; i++) {
        const wing = pieces.wings[i];
        const destIdx = moved[wing[0].face][wing[0].row * 5 + wing[0].column];
        if (initialHandedness[i] !== initialHandedness[destIdx]) {
          console.log(`MOVE ${move} MIXED HANDEDNESS!`);
        }
      }
    }
    console.log('Handedness check complete.');
  });
});
