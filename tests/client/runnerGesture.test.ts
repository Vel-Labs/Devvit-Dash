import { describe, expect, it } from 'vitest';
import { verticalGestureDirection } from '../../src/client/runnerGesture';

describe('Runner vertical gestures', () => {
  it('ignores movement below the lane threshold', () => {
    expect(verticalGestureDirection(200, 233, 34)).toBe(0);
    expect(verticalGestureDirection(200, 167, 34)).toBe(0);
  });

  it('maps upward and downward threshold crossings to adjacent directions', () => {
    expect(verticalGestureDirection(200, 166, 34)).toBe(-1);
    expect(verticalGestureDirection(200, 234, 34)).toBe(1);
  });

  it('supports repeated slide segments by evaluating from the last consumed point', () => {
    expect(verticalGestureDirection(300, 260, 34)).toBe(-1);
    expect(verticalGestureDirection(260, 220, 34)).toBe(-1);
  });
});
