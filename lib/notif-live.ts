import type { Notificacao } from "./types";

type Handler = (n: Notificacao) => void;

const handlers = new Set<Handler>();

export function notifyLive(n: Notificacao) {
  for (const handler of handlers) handler(n);
}

export function subscribeLiveNotifs(handler: Handler) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}
