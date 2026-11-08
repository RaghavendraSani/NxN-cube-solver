# 4×4 solver feasibility experiment

This is an isolated, developer-only experiment, not a supported solver or application dependency. It inspects the MIT-licensed `@cubesmith/scrambler` 0.15.0 package and temporarily exposes internal functions in memory. The package does not publicly export these functions; the experiment is tied to this exact version and may break if the package changes.

It converts five deterministic legal 4×4 scrambles from the project domain to the candidate piece model, then replays returned moves through the project domain. Passing these cases does not establish correctness for arbitrary states, performance, full validation, browser integration, or solver completeness.

From the project root in Windows PowerShell, with Node.js and dependencies installed:

```powershell
npm pack @cubesmith/scrambler@0.15.0 --pack-destination $env:TEMP
npx esbuild ./src/domain/nxn/cube.ts --bundle --platform=node --format=esm --outfile="$env:TEMP\cube-domain-m9-proof.mjs"
npx esbuild ./src/solver/fourByFour/convert.ts --bundle --platform=node --format=esm --outfile="$env:TEMP\cube-conversion-m9-proof.mjs"
node experiments/four-solver-proof.mjs
```

The experiment reads the downloaded archive from the system temporary directory; it does not modify the installed package. The package's MIT license is included in [CUBESMITH-LICENSE.txt](CUBESMITH-LICENSE.txt). If the solver is incorporated later, review the exact version and all transitive attribution requirements.

## Local solver timing sample

This separate benchmark exercises ten deterministic 40-move scrambles using the vendored solver and independently verifies every result. It runs in one Node process without a watchdog: its timings do not represent worker startup, browser overhead, other hardware, worst-case behavior, or the application's 120-second worker timeout.

```powershell
npx esbuild ./src/domain/nxn/cube.ts --bundle --platform=node --format=esm --outfile="$env:TEMP\cube-domain-m9-proof.mjs"
npx esbuild ./src/solver/fourByFour/solver.ts --bundle --platform=node --format=esm --outfile="$env:TEMP\cube-solver-m9-benchmark.mjs"
node experiments/four-benchmark.mjs
```
