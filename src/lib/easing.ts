export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const easeOutExpo = (x: number) =>
  x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);

export const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Approximate normal distribution, mean 0, sd ~0.55 */
export const randn = () =>
  Math.random() + Math.random() + Math.random() - 1.5;
