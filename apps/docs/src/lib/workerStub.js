// Stub module for Webpack — the actual worker files are served from /public/assets/
// This prevents "Module not found" errors during Next.js compilation.
// At runtime, the library constructs the Worker URL from import.meta.url which
// resolves to the correct /assets/*.js files in the public directory.
export default '';
