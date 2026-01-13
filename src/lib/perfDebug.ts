const isDev = process.env.NODE_ENV !== "production";

type Counters = {
  listeners: number;
  rafs: number;
  observers: number;
  observedNodes: number;
};

const counters: Counters = {
  listeners: 0,
  rafs: 0,
  observers: 0,
  observedNodes: 0,
};

function logCounters(reason: string) {
  if (!isDev || typeof window === "undefined") return;
  console.debug(
    `[perf] ${reason} | listeners=${counters.listeners} rafs=${counters.rafs} observers=${counters.observers} observedNodes=${counters.observedNodes}`
  );
}

export function registerListener(label: string) {
  if (!isDev || typeof window === "undefined") return () => {};
  counters.listeners += 1;
  logCounters(`listener+ ${label}`);
  return () => {
    counters.listeners = Math.max(0, counters.listeners - 1);
    logCounters(`listener- ${label}`);
  };
}

export function registerRaf(label: string) {
  if (!isDev || typeof window === "undefined") return () => {};
  counters.rafs += 1;
  logCounters(`raf+ ${label}`);
  return () => {
    counters.rafs = Math.max(0, counters.rafs - 1);
    logCounters(`raf- ${label}`);
  };
}

export function registerObserver(label: string, nodes = 0) {
  if (!isDev || typeof window === "undefined") return () => {};
  counters.observers += 1;
  counters.observedNodes += nodes;
  logCounters(`observer+ ${label}`);
  return () => {
    counters.observers = Math.max(0, counters.observers - 1);
    counters.observedNodes = Math.max(0, counters.observedNodes - nodes);
    logCounters(`observer- ${label}`);
  };
}
