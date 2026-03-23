export enum Algorithm {
  CatmullRom = 'Catmull-Rom',
  BezierCatmullRom = 'Bezier Catmull-Rom',
  Step = 'Step',
  Linear = 'Linear',
}

export const COLORS = {
  [Algorithm.Linear]: '#0375ff',
  [Algorithm.BezierCatmullRom]: '#68D391',
  [Algorithm.CatmullRom]: '#FF0072',
  [Algorithm.Step]: '#FF5733',
};

export const DEFAULT_ALGORITHM: Algorithm = Algorithm.Step;
