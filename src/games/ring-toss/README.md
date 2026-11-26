# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim: the circle shows where the ring can land.
- Click to throw a ring. Only one ring flies at a time.
- Each throw drifts up to 14 px from where you aimed, so aim for the middle of a neck.
- A ring that lands within 12 px of a bottle neck goes over it and stays there.
  A bottle that already has a ring can't take another.
- You have 8 rings. The round ends when the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

Bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwRing`, `step`, `bottleAt`,
  `ringPosition`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
