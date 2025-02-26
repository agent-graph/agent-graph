/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vertex, VertexId } from './vertex';
import { GraphRuntime } from './runtime';

export type Edge<
  S extends Vertex<any, any, any, any, any> = Vertex<any, any, any, any, any>,
  T extends VertexId = any,
  C = S extends Vertex<any, infer C, any, any, any> ? C : never,
  State = S extends Vertex<any, any, infer State, any, any> ? State : never,
  O = S extends Vertex<any, any, any, any, infer O> ? O : never,
> = (
  props: Readonly<O>,
  state: Readonly<State>,
  runtime: GraphRuntime<C>
) => Vertex<T, C, unknown, O>[] | Promise<Vertex<T, C, unknown, O>[]>;
/* eslint-enable @typescript-eslint/no-explicit-any */
