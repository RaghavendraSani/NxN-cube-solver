/**
 * Which cube sizes the interface offers. A size is enabled only when its validation,
 * solving, rendering and playback criteria are met (see ROADMAP.md, M12). The evidence for
 * each enabled size is produced by `tests/unit/solver/nxnSolver.test.ts` (generated and
 * structured states solved and replay-verified) and `tests/unit/rendering` (picking and
 * animation destinations on every size).
 */
export type SizeCapability = { size: number; enabled: boolean };

export const SIZE_CAPABILITIES: readonly SizeCapability[] = Array.from({ length: 18 }, (_, i) => ({
  size: i + 3,
  enabled: true,
}));

export const ENABLED_SIZES: readonly number[] = SIZE_CAPABILITIES.filter((c) => c.enabled).map(
  (c) => c.size,
);
