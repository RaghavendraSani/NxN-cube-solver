import type { Color } from './colors';
import type { Face } from './faces';

/** Face arrays contain size² stickers in row-major order, viewed from outside that face. */
export type CubeState = Readonly<Record<Face, readonly Color[]>>;
