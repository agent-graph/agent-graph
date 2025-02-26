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
