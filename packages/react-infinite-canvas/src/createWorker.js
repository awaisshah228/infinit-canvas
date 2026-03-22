export default function createWorker() {
  const worker = new Worker(
    new URL('./canvas.worker.js', import.meta.url),
    { type: 'module' }
  );
  return worker;
}
