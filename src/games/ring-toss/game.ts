import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, a throw can drift from the aim point on each axis. */
export const SCATTER = 14;
/** How close, in pixels, a ring must land to a bottle neck to ring it. */
export const NECK_REACH = 12;
export const HAND = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
/** Back row first. Bottles further back stand higher, look smaller and score more. */
const ROWS = [
  { y: 130, scale: 0.7, points: 30 },
  { y: 205, scale: 0.85, points: 20 },
  { y: 280, scale: 1, points: 10 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  /** Where the neck is: the point a ring has to land on. */
  x: number;
  y: number;
  scale: number;
  points: number;
  ringed: boolean;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  /** The ring in the air, if any. Only one flies at a time. */
  ring: Ring | null;
  /** Rings that missed, where they fell. */
  misses: { x: number; y: number }[];
  rings: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 110;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      scale: row.scale,
      points: row.points,
      ringed: false,
    })),
  );
  return { bottles, ring: null, misses: [], rings: RINGS_PER_ROUND, score: 0, phase: 'playing' };
}

/** The bottle whose neck a ring landing at (x, y) would go over, if any. */
export function bottleAt(state: RingTossState, x: number, y: number): Bottle | undefined {
  return state.bottles.find((b) => !b.ringed && Math.hypot(x - b.x, y - b.y) <= NECK_REACH);
}

/**
 * Throws one ring at the aim point. It lands up to SCATTER pixels off on each
 * axis; `random` returns a number in [0, 1) and is there so tests can pin it.
 * Returns false if nothing was thrown.
 */
export function throwRing(
  state: RingTossState,
  aimX: number,
  aimY: number,
  random: () => number = Math.random,
): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.ring) return false;
  state.ring = {
    fromX: HAND.x,
    fromY: HAND.y,
    toX: aimX + (random() * 2 - 1) * SCATTER,
    toY: Math.min(aimY, HAND.y) + (random() * 2 - 1) * SCATTER,
    age: 0,
  };
  state.rings -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  const ring = state.ring;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state, ring.toX, ring.toY);
      if (bottle) {
        bottle.ringed = true;
        state.score += bottle.points;
      } else {
        state.misses.push({ x: ring.toX, y: ring.toY });
      }
      state.ring = null;
    }
  }

  if (state.rings === 0 && !state.ring) state.phase = 'over';
}

/** Where the ring in the air is now: a straight line with a hop on top. */
export function ringPosition(ring: Ring): { x: number; y: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 80,
  };
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The bottles' table, back to front.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(80, ROWS[0].y + 30, WIDTH - 160, ROWS[ROWS.length - 1].y - ROWS[0].y + 40);

  for (const bottle of state.bottles) {
    const s = bottle.scale;
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 14 * s, bottle.y + 12 * s, 28 * s, 40 * s);
    ctx.fillRect(bottle.x - 5 * s, bottle.y - 4 * s, 10 * s, 18 * s);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 6 * s, bottle.y - 8 * s, 12 * s, 5 * s);
    if (bottle.ringed) drawRing(ctx, bottle.x, bottle.y + 10 * s, s);
  }

  for (const miss of state.misses) {
    ctx.globalAlpha = 0.5;
    drawRing(ctx, miss.x, miss.y, 0.85);
  }
  ctx.globalAlpha = 1;

  if (state.ring) {
    const { x, y } = ringPosition(state.ring);
    drawRing(ctx, x, y, 1.2);
  }

  if (state.phase === 'playing') {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, SCATTER, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description:
    'Land rings on the bottle necks before you run out. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwRing(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
