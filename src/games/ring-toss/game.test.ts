import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  HAND,
  NECK_REACH,
  RINGS_PER_ROUND,
  SCATTER,
  bottleAt,
  createState,
  ringPosition,
  step,
  throwRing,
} from './game';

/** Lands every throw exactly on the aim point. */
const noScatter = () => 0.5;

describe('ring toss', () => {
  it('starts with a full hand of rings, no score and no ringed bottles', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles.some((b) => b.ringed)).toBe(false);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = state.bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400, 200, noScatter)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.ring).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    throwRing(state, 400, 200, noScatter);
    expect(throwRing(state, 400, 200, noScatter)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(throwRing(state, 400, 200, noScatter)).toBe(false);
  });

  it('scatters a throw by at most SCATTER on each axis', () => {
    const state = createState();
    throwRing(state, 400, 200, () => 0);
    expect(state.ring?.toX).toBe(400 - SCATTER);
    expect(state.ring?.toY).toBe(200 - SCATTER);
  });

  it('scores a ring that lands on a bottle neck and keeps it there', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwRing(state, bottle.x, bottle.y, noScatter);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(true);
    expect(state.ring).toBeNull();
  });

  it('misses a ring that lands away from every neck', () => {
    const state = createState();
    throwRing(state, 5, 5, noScatter);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.misses).toHaveLength(1);
  });

  it('does not score a bottle that already has a ring on it', () => {
    const state = createState();
    const bottle = state.bottles[0];
    bottle.ringed = true;
    expect(bottleAt(state, bottle.x, bottle.y)).toBeUndefined();
    throwRing(state, bottle.x, bottle.y, noScatter);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
  });

  it('only rings a neck within reach', () => {
    const state = createState();
    const bottle = state.bottles[0];
    expect(bottleAt(state, bottle.x + NECK_REACH, bottle.y)).toBe(bottle);
    expect(bottleAt(state, bottle.x + NECK_REACH + 1, bottle.y)).toBeUndefined();
  });

  it('ends the round once the last ring has landed', () => {
    const state = createState();
    state.rings = 1;
    throwRing(state, 400, 200, noScatter);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('over');
  });

  it('flies from the hand to where the ring lands', () => {
    const ring = { fromX: HAND.x, fromY: HAND.y, toX: 100, toY: 150, age: 0 };
    expect(ringPosition(ring)).toEqual({ x: HAND.x, y: HAND.y });
    ring.age = FLIGHT_TIME;
    const end = ringPosition(ring);
    expect(end.x).toBeCloseTo(100);
    expect(end.y).toBeCloseTo(150);
  });
});
