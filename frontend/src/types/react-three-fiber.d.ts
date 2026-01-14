// Allow JSX intrinsic elements used by @react-three/fiber
// This file augments the global JSX namespace so TypeScript won't
// complain about elements like <mesh />, <torusGeometry />, <ambientLight />, etc.
// It's intentionally permissive (any) because @react-three/fiber provides its own
// JSX types at runtime; adding this ensures the editor type checker is happy.
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
