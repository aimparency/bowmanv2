import * as vec2 from './vec2';

const SQR_3_4 = Math.sqrt(3/4);

function rotCW(v: vec2.Vec2): vec2.Vec2 {
  return vec2.fromValues(v[1], -v[0]);
}

export function makeCircularPath(
  from: { pos: vec2.Vec2; r: number },
  width: number,
  into: { pos: vec2.Vec2; r: number }
): string {
  const delta = vec2.crSub(into.pos, from.pos);
  const R = vec2.len(delta);

  if (R < from.r + into.r) {
    return "";
  }

  const deltaRot = rotCW(delta);
  vec2.scale(deltaRot, deltaRot, SQR_3_4);

  // Point between from and into
  const halfWay = vec2.crAdd(from.pos, into.pos);
  vec2.scale(halfWay, halfWay, 0.5);

  // Center point of arc
  const M = vec2.crAdd(halfWay, deltaRot);

  const getMNorm = (point: vec2.Vec2): vec2.Vec2 => {
    const result = vec2.crSub(point, M);
    vec2.normalize(result, result);
    return result;
  };

  const getArcPoint = (radius: number): vec2.Vec2 => {
    const a = Math.pow(radius, 2) / (2 * R);
    const h = Math.sqrt(Math.pow(radius, 2) - Math.pow(a, 2));

    const normMToInto = getMNorm(into.pos);
    const normMToIntoRot = rotCW(normMToInto);

    vec2.scale(normMToInto, normMToInto, a);
    vec2.scale(normMToIntoRot, normMToIntoRot, h);

    const result = vec2.clone(into.pos);
    vec2.sub(result, result, normMToInto);
    vec2.sub(result, result, normMToIntoRot);
    return result;
  };

  const arrowPeak = getArcPoint(into.r);
  const arrowWings = getArcPoint(into.r + width * 1);
  const normMToArrowWings = getMNorm(arrowWings);

  const toFarWingSide = vec2.crScale(normMToArrowWings, width * 1);
  const toNearWingSide = vec2.crScale(normMToArrowWings, width * 0.5);

  const wingOuterFar = vec2.crAdd(arrowWings, toFarWingSide);
  const wingOuterNear = vec2.crAdd(arrowWings, toNearWingSide);
  const wingInnerFar = vec2.crSub(arrowWings, toFarWingSide);
  const wingInnerNear = vec2.crSub(arrowWings, toNearWingSide);

  const normMToMFrom = getMNorm(from.pos);
  const toTheSide = vec2.crScale(normMToMFrom, width);
  const startOuter = vec2.crAdd(from.pos, toTheSide);
  const startInner = vec2.crSub(from.pos, toTheSide);

  const normMToMFromRot = rotCW(normMToMFrom);

  const outerDistance = vec2.dist(wingOuterNear, startOuter) * 0.34;
  const h1 = vec2.crScale(normMToMFromRot, outerDistance);
  const h2 = vec2.crScale(normMToMFromRot, outerDistance);
  const outerWingControl = vec2.crSub(wingOuterNear, h1);
  const outerStartControl = vec2.crAdd(startOuter, h2);

  const innerDistance = vec2.dist(wingInnerNear, startInner) * 0.34;
  const h3 = vec2.crScale(normMToMFromRot, innerDistance);
  const h4 = vec2.crScale(normMToMFromRot, innerDistance);
  const innerWingControl = vec2.crSub(wingInnerNear, h3);
  const innerStartControl = vec2.crAdd(startInner, h4);

  const pathSpec = [
    'M', startInner,
    'C', innerStartControl, innerWingControl, wingInnerNear,
    'L', wingInnerFar,
    'L', arrowPeak,
    'L', wingOuterFar,
    'L', wingOuterNear,
    'C', outerWingControl, outerStartControl, startOuter,
  ];

  const widthWithStroke = width * 1.1;
  if (widthWithStroke > from.r) {
    const arcR = width * 1.001;
    pathSpec.push(`A ${arcR} ${arcR} 0 0 1 ${startInner[0]} ${startInner[1]}`);
  }
  pathSpec.push('Z');

  return pathSpec.map(c => {
    if (typeof c === "string") {
      return c;
    } else {
      return `${c[0]} ${c[1]}`;
    }
  }).join(' ');
}

export function getConnectionControlPoints(
  from: { pos: vec2.Vec2; r: number },
  into: { pos: vec2.Vec2; r: number },
  curvature: number = 0.3
): { 
  start: vec2.Vec2, 
  end: vec2.Vec2, 
  control1: vec2.Vec2, 
  control2: vec2.Vec2,
  midpoint: vec2.Vec2
} {
  const delta = vec2.crSub(into.pos, from.pos);
  const distance = vec2.len(delta);
  
  if (distance === 0) {
    return {
      start: from.pos,
      end: into.pos,
      control1: from.pos,
      control2: into.pos,
      midpoint: from.pos
    };
  }

  // Normalize delta
  const normalizedDelta = vec2.clone(delta);
  vec2.normalize(normalizedDelta, normalizedDelta);

  // Calculate start and end points on circle edges
  const start = vec2.crAdd(from.pos, vec2.crScale(normalizedDelta, from.r));
  const end = vec2.crSub(into.pos, vec2.crScale(normalizedDelta, into.r));

  // Calculate control points for curve
  const midpoint = vec2.crAdd(start, end);
  vec2.scale(midpoint, midpoint, 0.5);

  // Perpendicular vector for curve offset
  const perpendicular: vec2.Vec2 = [-normalizedDelta[1], normalizedDelta[0]];
  const curveOffset = distance * curvature;
  
  const control1 = vec2.crAdd(
    vec2.crAdd(start, end),
    vec2.crScale(perpendicular, curveOffset)
  );
  vec2.scale(control1, control1, 0.5);
  
  const control2 = vec2.clone(control1);

  return { start, end, control1, control2, midpoint };
}