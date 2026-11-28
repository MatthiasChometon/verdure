// Blocks that ask for an idle turn are served one at a time, one per idle period, in the
// order they asked. Each then renders in a task of its own instead of all in one.
type Turn = () => void;

const queue: Turn[] = [];
let scheduled = false;

const schedule = (callback: () => void): void => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout: 400 });
    return;
  }
  setTimeout(callback, 50);
};

const serveNext = (): void => {
  scheduled = false;
  const turn = queue.shift();
  turn?.();
  if (queue.length > 0) {
    scheduled = true;
    schedule(serveNext);
  }
};

export const useIdleTurn = (): { request: (turn: Turn) => () => void } => ({
  request: (turn: Turn): (() => void) => {
    queue.push(turn);
    if (!scheduled) {
      scheduled = true;
      schedule(serveNext);
    }
    return (): void => {
      const index = queue.indexOf(turn);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    };
  },
});
