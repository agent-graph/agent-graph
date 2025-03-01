import { VertexId } from './vertex';
import { Graph } from './graph';
import { Checkpointer, States, Steps } from './checkpoint';
import { ExitStatus, GraphRuntime, Interrupt } from './runtime';

/**
 * Lifecycle: run(init) -> superstep() -> interrupt() -> superstep() -> exit() -> ... -> shutdown()
 * */
export class BuiltGraph<C, V extends VertexId = never> {
  running = false;
  readonly context: C;
  readonly version = 1;
  readonly builder: Graph<C, V>;
  readonly checkpointer?: Checkpointer<V>;
  readonly interruptVectorTable: Interrupt[] = [];
  readonly shutdownHooks: (() => void | Promise<void>)[] = [];
  readonly computedListeners: ((vertexId: V, props: Readonly<unknown>) => void)[] = [];

  constructor({
    builder,
    context,
    checkpointer,
  }: {
    builder: Graph<C, V>;
    context: C;
    checkpointer?: Checkpointer<V>;
    // graph entry point, for subgraph
    // entry?: V;
  }) {
    this.context = context;
    this.builder = builder;
    this.checkpointer = checkpointer;
    this.checkpointer?.setVersion(this.version);
    // runtime methods
    this.exit = this.exit.bind(this);
    this.interrupt = this.interrupt.bind(this);
    this.addShutdownHook = this.addShutdownHook.bind(this);
  }

  // todo: priority queue ...
  private interrupt(interrupt: Interrupt) {
    this.interruptVectorTable.push(interrupt);
  }

  private exit(status: ExitStatus) {
    this.running = false;
  }

  private addShutdownHook(hook: () => void | Promise<void>) {
    this.shutdownHooks.push(hook);
  }

  private async shutdown() {
    const hook = this.shutdownHooks.pop();
    if (!hook) return;
    await hook();
  }

  get runtime(): GraphRuntime<C> {
    return {
      context: this.context,
      version: this.version,
      exit: this.exit,
      interrupt: this.interrupt,
      addShutdownHook: this.addShutdownHook,
    };
  }

  onComputed(listener: (vertexId: V, props: Readonly<unknown>) => void) {
    this.computedListeners.push(listener);
  }

  private activeAllVertices() {
    for (const vertex of this.builder.vertices.values()) {
      vertex.active();
    }
  }

  private setVertexStates(states: States<V>) {
    for (const [id, state] of Object.entries(states)) {
      const vertex = this.builder.vertices.get(id as V);
      vertex?.setState(state as never);
    }
  }

  private getVertexStates() {
    const states = {} as States<V>;
    for (const vertex of this.builder.vertices.values()) {
      states[vertex.id] = vertex.state;
    }
    return states;
  }

  // single vertex compute
  private async compute(vertexId: V, inputProps: Readonly<unknown>) {
    const vertex = this.builder.vertices.get(vertexId);
    if (!vertex) return [];

    const getOutEdges = this.builder.edges.get(vertex.id as V);
    const props = await vertex.compute(inputProps, this.runtime);
    this.computedListeners.forEach((listener) => listener(vertexId, props));
    const edges = getOutEdges
      ? (await getOutEdges(props, vertex.state, this.runtime)).map((v) => v.id)
      : [];
    if (vertex.isWaiting) {
      return [{ next: vertexId, props: inputProps }];
    }
    const steps: Steps<V> = edges.map((next) => ({ next, props }));
    return steps;
  }

  private async superstep(state: Steps<V>) {
    const promises = state.map(({ next, props }) => this.compute(next, props));
    return (await Promise.all(promises)).flat();
  }

  async run(initialSteps: Steps<V>, initialStates: States<V> = {}) {
    this.running = true;
    let steps = initialSteps;
    this.setVertexStates(initialStates);
    this.activeAllVertices();

    while (steps.length !== 0) {
      // filter active vertices
      const activeSteps = steps.filter(({ next }) => this.builder.vertices.get(next)?.isActive);
      const otherSteps = steps.filter(({ next }) => !this.builder.vertices.get(next)?.isActive);

      if (activeSteps.length === 0) break;

      const nextSteps = await this.superstep(activeSteps);
      steps = [...nextSteps, ...otherSteps];

      await this.checkpointer?.save(steps, this.getVertexStates());
      if (!this.running) break;
    }
    await this.shutdown();
  }
}
