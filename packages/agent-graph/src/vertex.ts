import { GraphRuntime } from './runtime';

export type VertexId = Lowercase<string>;
export type VertexStatus = 'active' | 'inactive' | 'waiting'; // pending, executing, waiting

export class Vertex<
  V extends VertexId,
  C,
  S = undefined,
  // State = S extends never ? undefined : S,
  I = unknown,
  O = unknown,
> {
  readonly id: V;
  state: Readonly<S>;
  private status: VertexStatus = 'active';
  readonly compute: (
    props: Readonly<I>,
    runtime: GraphRuntime<C>
  ) => Readonly<O> | Promise<Readonly<O>>;

  constructor({
    id,
    compute,
    state,
  }: {
    id: V;
    state?: S;
    compute: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this: Vertex<V, C, S, any, any>,
      props: Readonly<I>,
      runtime: GraphRuntime<C>
    ) => O | Promise<O>;
    // cleanup?: () => void;
  }) {
    this.id = id;
    this.state = state as S;
    this.compute = compute.bind(this);

    this.halt = this.halt.bind(this);
    this.wait = this.wait.bind(this);
    this.active = this.active.bind(this);
    this.setState = this.setState.bind(this);
  }

  get isActive() {
    return this.status === 'active';
  }

  get isInactive() {
    return this.status === 'inactive';
  }

  get isWaiting() {
    return this.status === 'waiting';
  }

  active() {
    this.status = 'active';
  }

  halt() {
    this.status = 'inactive';
  }

  wait() {
    this.status = 'waiting';
  }

  setState<K extends keyof S>(newState: Pick<S, K> | S) {
    this.state = { ...this.state, ...newState };
  }
}
