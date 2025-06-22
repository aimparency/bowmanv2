/* Simple 2D vector utilities adapted from Summits */

export type Vec2 = [number, number];

export function create(): Vec2 {
  return [0, 0];
}

export function fromValues(x: number, y: number): Vec2 {
  return [x, y];
}

export function clone(a: Vec2): Vec2 {
  return [a[0], a[1]];
}

export function add(out: Vec2, a: Vec2, b: Vec2): void {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
}

export function sub(out: Vec2, a: Vec2, b: Vec2): void {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
}

export function scale(out: Vec2, a: Vec2, s: number): void {
  out[0] = a[0] * s;
  out[1] = a[1] * s;
}

export function dist2(a: Vec2, b: Vec2): number {
  return Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2);
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt(dist2(a, b));
}

export function len(a: Vec2): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}

export function normalize(out: Vec2, a: Vec2): void {
  const length = len(a);
  if (length > 0) {
    out[0] = a[0] / length;
    out[1] = a[1] / length;
  }
}

// Create and return new vectors (convenience functions)
export function crAdd(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

export function crSub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

export function crScale(a: Vec2, s: number): Vec2 {
  return [a[0] * s, a[1] * s];
}

export function eq(a: Vec2, b: Vec2): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}