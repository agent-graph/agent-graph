import { VertexId } from './vertex';

export type States<V extends VertexId = never> = {
  [key in V]?: Readonly<unknown>;
};

export type Steps<V extends VertexId = never> = {
  next: V;
  props: Readonly<unknown>;
}[];

export interface Checkpointer<V extends VertexId = never> {
  setVersion(version: number): void;
  save(steps: Steps<V>, states: States<V>): Promise<void>;
}

// export type Checkpoint<V extends VertexId = never> = {
//   id: number;
//   chatId: string;
//   version: number;
//   timestamp: string;
//   steps: Steps<V>;
//   states: States<V>;
// };
