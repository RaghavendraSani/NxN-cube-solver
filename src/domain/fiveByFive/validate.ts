import type { CubeState } from '../cube/types';
import { checkNxNEntry, type NxNEntryStatus } from '../nxn/validate';

/**
 * Check a 5×5×5 entry. The checks are the general N×N reachability invariants (see
 * `../nxn/validate.ts`); `counts-ok` means the cube can exist on a real 5×5×5.
 */
export function check5Entry(state: CubeState): NxNEntryStatus {
  return checkNxNEntry(state, 5);
}
