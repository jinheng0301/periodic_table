import { Euler, Object3D, Vector3 } from "three";

export const TABLE = Object.freeze({ columns: 20, rows: 10, dx: 140, dy: 180 });
export const GRID = Object.freeze({ columns: 5, rows: 4, layers: 10, dx: 300, dy: 300, dz: 400 });

function outwardRotation(position) {
  const object = new Object3D();
  object.position.copy(position);
  object.lookAt(position.clone().multiplyScalar(2));
  return object.rotation.clone();
}

function pose(position, rotation = new Euler()) {
  return { position, rotation };
}

export function tableLayout(n) {
  return Array.from({ length: n }, (_, i) => {
    const col = i % TABLE.columns;
    const row = Math.floor(i / TABLE.columns);
    return pose(new Vector3((col - 9.5) * TABLE.dx, (4.5 - row) * TABLE.dy, 0));
  });
}

export function sphereLayout(n) {
  return Array.from({ length: n }, (_, i) => {
    const phi = Math.acos(-1 + (2 * i) / n);
    const theta = Math.sqrt(n * Math.PI) * phi;
    const position = new Vector3().setFromSphericalCoords(900, phi, theta);
    return pose(position, outwardRotation(position));
  });
}

export function helixLayout(n) {
  const perStrand = Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i) => {
    const strand = i % 2;
    const idx = Math.floor(i / 2);
    const theta = idx * 0.35 + strand * Math.PI;
    const position = new Vector3(
      900 * Math.sin(theta),
      (perStrand / 2 - idx) * 16,
      900 * Math.cos(theta)
    );
    return pose(position, outwardRotation(position));
  });
}

export function gridLayout(n) {
  return Array.from({ length: n }, (_, i) => {
    const x = i % GRID.columns;
    const y = Math.floor(i / GRID.columns) % GRID.rows;
    const z = Math.floor(i / (GRID.columns * GRID.rows));
    return pose(new Vector3(
      (x - 2) * GRID.dx,
      (1.5 - y) * GRID.dy,
      (4.5 - z) * GRID.dz
    ));
  });
}

export function buildLayouts(n) {
  return {
    table: tableLayout(n),
    sphere: sphereLayout(n),
    helix: helixLayout(n),
    grid: gridLayout(n)
  };
}
