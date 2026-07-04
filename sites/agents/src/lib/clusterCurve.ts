/**
 * Scale-up, hold-at-peak, scale-down curve for active CPUs / VM grid.
 * Mirrors a real cluster lifecycle: workers boot, run at peak, then
 * release to zero as the job completes. Returns a 0..1 lit fraction.
 *
 *   0.00–0.18  ramp up to peak
 *   0.18–0.72  cruising at peak
 *   0.72–0.95  scale down as jobs finish
 *   0.95–1.00  idle, every worker released
 */
export function clusterCurve(t: number): number {
  if (t < 0.18) {
    const k = t / 0.18;
    return 1 - Math.pow(1 - k, 2.4);
  }
  if (t < 0.72) {
    return 1;
  }
  if (t < 0.95) {
    const k = (t - 0.72) / 0.23;
    return Math.max(0, 1 - k * k);
  }
  return 0;
}
