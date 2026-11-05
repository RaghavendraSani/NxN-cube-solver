import { CubeViewport } from './components/CubeViewport';

export function App() {
  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="app-title">
        <p className="eyebrow">3×3 cube preview</p>
        <h1 id="app-title">CubeSolver</h1>
        <p className="welcome-copy">
          Click a square to inspect its position. Color editing and solving will be added later.
        </p>
        <CubeViewport />
      </section>
    </main>
  );
}
