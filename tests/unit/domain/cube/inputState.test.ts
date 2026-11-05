// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { paintFacelet, countColors } from '../../../../src/domain/cube/inputState';
import { createUnassignedCube } from '../../../../src/domain/cube/state';

describe('cube input', () => {
  it('paints and repaints one square without mutating the original state', () => {
    const original = createUnassignedCube();
    const address = { face: 'F', row: 1, column: 2 } as const;
    const red = paintFacelet(original, address, 'red');
    const green = paintFacelet(red, address, 'green');
    expect(original.F.every((color) => color === 'unassigned')).toBe(true);
    expect(red.F[5]).toBe('red');
    expect(green.F[5]).toBe('green');
    expect(green.F.filter((color) => color !== 'unassigned')).toHaveLength(1);
    expect(countColors(green).green).toBe(1);
    expect(countColors(green).unassigned).toBe(53);
  });

  it('records an intentional white facelet as assigned', () => {
    const result = paintFacelet(createUnassignedCube(), { face: 'U', row: 0, column: 0 }, 'white');
    expect(countColors(result).white).toBe(1);
    expect(countColors(result).unassigned).toBe(53);
  });
});
