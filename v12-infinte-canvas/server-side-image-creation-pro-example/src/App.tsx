import Preview from './Preview';
import ExampleFlow from './ExampleFlow';

export default function App() {
  return (
    <div className="app">
      <div className="container">
        <span className="label">Interactive Flow Input</span>
        <ExampleFlow />
      </div>
      <div className="container">
        <span className="label">Static Image Output</span>
        <Preview />
      </div>
    </div>
  );
}
