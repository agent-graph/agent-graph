import { Vertex, VertexId } from './vertex';
import { GraphRuntime } from './runtime';
import { CompiledGraph } from './compiled-graph';
import { Checkpointer } from './checkpoint';

export class Graph<C, V extends VertexId = never> {
  readonly vertices = new Map<V, Vertex<V, C>>();
  readonly edges = new Map<
    V,
    (i: unknown, runtime: GraphRuntime<C>) => Vertex<V, C>[] | Promise<Vertex<V, C>[]>
  >();

  addV<K extends VertexId, S, I, O>(vertex: Vertex<K, C, S, I, O>): Graph<C, V | K> {
    if (this.vertices.has(vertex.id as unknown as V)) {
      throw new Error(`Vertex ${vertex.id} already exists`);
    }
    this.vertices.set(vertex.id as unknown as V, vertex as never);
    return this as Graph<C, V | K>;
  }

  addE<S, I, O>(
    from: Vertex<V, C, S, I, O>,
    to: (
      props: Readonly<O>,
      state: Readonly<S>,
      runtime: GraphRuntime<C>
    ) => Vertex<V, C, unknown, O>[] | Promise<Vertex<V, C, unknown, O>[]>
  ): this {
    if (this.edges.has(from.id)) {
      throw new Error(`Edge from ${from.id} already exists`);
    }
    this.edges.set(from.id, to as never);
    return this;
  }

  compile({ context, checkpointer }: { context: C; checkpointer?: Checkpointer<V> }) {
    return new CompiledGraph<C, V>({ builder: this, context, checkpointer });
  }
}
