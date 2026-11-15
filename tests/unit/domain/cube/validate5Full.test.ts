import { describe, expect, it } from 'vitest';
import type { Color } from '../../../../src/domain/cube/colors';
import { createNxNCube, applyNxNMove, type CubeState } from '../../../../src/domain/nxn/cube';
import { parseMove5 } from '../../../../src/domain/fiveByFive/notation';
import { check5Entry } from '../../../../src/domain/fiveByFive/validate';
import { pieces5 } from '../../../../src/domain/fiveByFive/pieces';

const pieces = pieces5();

const MOVES = [
  'U', 'D', 'R', 'L', 'F', 'B',
  '2U', '2D', '2R', '2L', '2F', '2B',
  'Rw', 'Lw', 'Fw', 'Bw', 'Uw', 'Dw',
].flatMap((f) => [`${f}`, `${f}'`, `${f}2`]).map(parseMove5);

function randomScramble(cube: CubeState, movesCount = 30): CubeState {
  let c = cube;
  for (let i = 0; i < movesCount; i++) {
    c = applyNxNMove(c, 5, MOVES[Math.floor(Math.random() * MOVES.length)]);
  }
  return c;
}

describe('comprehensive 5×5 validation invariants', () => {
  it('validates 1000 random legal scrambles with 100% success', () => {
    for (let i = 0; i < 1000; i++) {
      const cube = randomScramble(createNxNCube(5, true), 25);
      const res = check5Entry(cube);
      expect(res.status).toBe('checks-ok');
    }
  });

  it('rejects 1000 illegal single-fault states', () => {
    let rejectedCount = 0;

    for (let i = 0; i < 200; i++) {
      // 1. Twisted corner (illegal orientation)
      const cube1 = randomScramble(createNxNCube(5, true), 15);
      const corner = pieces.corners[Math.floor(Math.random() * pieces.corners.length)];
      const c0 = cube1[corner[0].face][corner[0].row * 5 + corner[0].column];
      const c1 = cube1[corner[1].face][corner[1].row * 5 + corner[1].column];
      const c2 = cube1[corner[2].face][corner[2].row * 5 + corner[2].column];
      cube1[corner[0].face][corner[0].row * 5 + corner[0].column] = c1;
      cube1[corner[1].face][corner[1].row * 5 + corner[1].column] = c2;
      cube1[corner[2].face][corner[2].row * 5 + corner[2].column] = c0;
      expect(check5Entry(cube1).status).not.toBe('checks-ok');
      rejectedCount++;

      // 2. Flipped middle edge (illegal orientation)
      const cube2 = randomScramble(createNxNCube(5, true), 15);
      const edge = pieces.middleEdges[Math.floor(Math.random() * pieces.middleEdges.length)];
      const e0 = cube2[edge[0].face][edge[0].row * 5 + edge[0].column];
      const e1 = cube2[edge[1].face][edge[1].row * 5 + edge[1].column];
      cube2[edge[0].face][edge[0].row * 5 + edge[0].column] = e1;
      cube2[edge[1].face][edge[1].row * 5 + edge[1].column] = e0;
      expect(check5Entry(cube2).status).not.toBe('checks-ok');
      rejectedCount++;

      // 3. Flipped wing cubie (reverses intrinsic physical handedness)
      const cube3 = randomScramble(createNxNCube(5, true), 15);
      const wing = pieces.wings[Math.floor(Math.random() * pieces.wings.length)];
      const w0 = cube3[wing[0].face][wing[0].row * 5 + wing[0].column];
      const w1 = cube3[wing[1].face][wing[1].row * 5 + wing[1].column];
      cube3[wing[0].face][wing[0].row * 5 + wing[0].column] = w1;
      cube3[wing[1].face][wing[1].row * 5 + wing[1].column] = w0;
      expect(check5Entry(cube3).status).not.toBe('checks-ok');
      rejectedCount++;

      // 4. Swapped two middle edges (illegal middle edge permutation parity)
      const cube4 = randomScramble(createNxNCube(5, true), 15);
      const m1 = pieces.middleEdges[0];
      const m2 = pieces.middleEdges[1];
      for (let j = 0; j < 2; j++) {
        const temp = cube4[m1[j].face][m1[j].row * 5 + m1[j].column];
        cube4[m1[j].face][m1[j].row * 5 + m1[j].column] = cube4[m2[j].face][m2[j].row * 5 + m2[j].column];
        cube4[m2[j].face][m2[j].row * 5 + m2[j].column] = temp;
      }
      expect(check5Entry(cube4).status).not.toBe('checks-ok');
      rejectedCount++;

      // 5. Invalid wing sticker (corrupting a wing to an impossible color)
      const cube5 = randomScramble(createNxNCube(5, true), 15);
      const targetWing = pieces.wings[0];
      // Set to opposite color of the other sticker
      const otherColor = cube5[targetWing[1].face][targetWing[1].row * 5 + targetWing[1].column];
      const opposite: Record<Color, Color> = {
        white: 'yellow', yellow: 'white',
        green: 'blue', blue: 'green',
        red: 'orange', orange: 'red',
      };
      cube5[targetWing[0].face][targetWing[0].row * 5 + targetWing[0].column] = opposite[otherColor];
      expect(check5Entry(cube5).status).not.toBe('checks-ok');
      rejectedCount++;
    }

    expect(rejectedCount).toBe(1000);
    console.log(`Successfully verified rejection of all ${rejectedCount} illegal single-fault states!`);
  });
});
