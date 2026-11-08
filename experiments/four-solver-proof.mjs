/* global process, Buffer, performance, console */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const temp = process.env.TEMP;
const domain = await import(pathToFileURL(join(temp, 'cube-domain-m9-proof.mjs')));
const converter = await import(pathToFileURL(join(temp, 'cube-conversion-m9-proof.mjs')));
const archive = join(temp, 'cubesmith-scrambler-0.15.0.tgz');
const src = execFileSync('tar', ['-xOf', archive, 'package/dist/index.js'], {
  encoding: 'utf8',
  maxBuffer: 5000000,
});
const candidate = await import(
  'data:text/javascript;base64,' +
    Buffer.from(
      src + '\nexport { solve444, SOLVED_444_STATE, move444Tables, pieces444 };',
    ).toString('base64')
);
const { facelets, cornerFacelets, wingFacelets, centreFacelets } = candidate.pieces444();
const layout = {
  faces: candidate.FACES,
  facelets: facelets.map((f) => {
    const p = f.position.map((v, i) => v - f.normal[i]);
    return domain.fromNxNCoordinates({ position: p, normal: f.normal }, 4);
  }),
  corners: cornerFacelets,
  wings: wingFacelets,
  centers: centreFacelets,
};
const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
const tables = candidate.move444Tables();
let seed = 427;
for (let sample = 0; sample < 5; sample++) {
  let cube = domain.createNxNCube(4, true);
  for (let k = 0; k < 8; k++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const face = faces[(seed >>> 16) % 6];
    seed = (seed * 1664525 + 1013904223) >>> 0;
    cube = domain.applyNxNMove(cube, 4, {
      face,
      layer: 0,
      width: ((seed >>> 8) % 2) + 1,
      turns: [1, -1, 2][(seed >>> 16) % 3],
    });
  }
  const start = performance.now();
  const solution = candidate.solve444(converter.convertFourState(cube, layout));
  for (const i of solution) {
    const m = tables[i].move;
    cube = domain.applyNxNMove(cube, 4, {
      face: m.face,
      layer: 0,
      width: m.depth,
      turns: m.amount === 3 ? -1 : m.amount,
    });
  }
  const ok = faces.every((face) => cube[face].every((color) => color === cube[face][0]));
  console.log(
    JSON.stringify({
      sample,
      elapsedMs: Math.round(performance.now() - start),
      moves: solution.length,
      independentReplaySolved: ok,
    }),
  );
  if (!ok) throw Error('Independent replay failed');
}
