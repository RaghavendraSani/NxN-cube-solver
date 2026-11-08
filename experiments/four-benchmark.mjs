/* global process, console, performance */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Developer-only benchmark: both bundles are built from local source by the README commands.
const domain = await import(pathToFileURL(join(process.env.TEMP, 'cube-domain-m9-proof.mjs')));
const solver = await import(pathToFileURL(join(process.env.TEMP, 'cube-solver-m9-benchmark.mjs')));
const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
let seed = 0x76584321;
for (let sample = 0; sample < 10; sample++) {
  let cube = domain.createNxNCube(4, true);
  for (let n = 0; n < 40; n++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const face = faces[(seed >>> 16) % 6];
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const layerMode = (seed >>> 8) % 3;
    cube = domain.applyNxNMove(cube, 4, {
      face,
      layer: layerMode === 1 ? 1 : 0,
      width: layerMode === 2 ? 2 : 1,
      turns: [1, -1, 2][(seed >>> 16) % 3],
    });
  }
  const started = performance.now();
  try {
    const moves = solver.solveFour(cube);
    const elapsedMs = Math.round(performance.now() - started);
    const verified = solver.verifyFourSolution(cube, moves);
    console.log(JSON.stringify({ sample: sample + 1, elapsedMs, moves: moves.length, verified }));
    if (!verified) process.exitCode = 1;
  } catch (error) {
    console.log(
      JSON.stringify({
        sample: sample + 1,
        elapsedMs: Math.round(performance.now() - started),
        error: String(error),
      }),
    );
    process.exitCode = 1;
  }
}
