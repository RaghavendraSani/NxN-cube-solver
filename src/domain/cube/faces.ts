export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type Face = (typeof FACES)[number];
