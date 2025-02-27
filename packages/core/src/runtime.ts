export type Interrupt = {
  type: string;
  data?: unknown;
  priority: number;
  enabled: boolean;
  handler?: () => void;
};

export enum ExitStatus {
  SUCCESS = 0,
  ERROR = 1,
}

export type GraphRuntime<C> = {
  context: C;
  version: number;
  exit: (status: ExitStatus) => void;
  interrupt: (interrupt: Interrupt) => void;
  addShutdownHook: (hook: () => void | Promise<void>) => void;
};

export const mockGraphRuntime: GraphRuntime<unknown> = {
  context: {},
  version: 0,
  exit: () => {},
  interrupt: () => {},
  addShutdownHook: () => {},
};

export function createGraphRuntime<C>(context: C): GraphRuntime<C> {
  return {
    context,
    version: 0,
    exit: () => {},
    interrupt: () => {},
    addShutdownHook: () => {},
  };
}
