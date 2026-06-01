// Compatibility shim: App.jsx imports `./components/EcosystemPage`.
// New implementation lives in src/pages/Ecosystem.jsx — re-export so the
// existing wiring keeps working without touching App.jsx.
export { default } from '../pages/Ecosystem'
