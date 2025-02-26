# Agent Graph

A lightweight AI Agent orchestration solution for Serverless environment.
Inspired by [Langgraph](https://www.langchain.com/langgraph), [Gremlin](https://tinkerpop.apache.org/gremlin.html), [Pregel](https://research.google/pubs/pregel-a-system-for-large-scale-graph-processing/) and [React](https://react.dev/).

## Key Features

- Supports running in Serverless environments, core package has zero dependencies, no vendor locking.
- Type-safe, data is passed between Vertices on demand, without being exposed globally.
- No `start` and `end` nodes(vertices), can be started from any node(vertex) in the Graph, convenient for debugging.
- Runs infinitely until there are no active Vertices or data transmission.
- Supports parallel execution, node interruption (waiting), implementing Human in the loop.
- Customizable Global Context, supports sharing global resources.

## Get started

### Installation

```shell
pnpm add @agent-graph/core
````

### Basic usage:

```typescript
import { Vertex, Graph } from '@agent-graph/core';

interface Context {
  userId: string;
};

const writer = new Vertex({
  id: 'writer',
  compute: (props: { name?: string }) => `Hello, ${props?.name || 'World'}!`,
});

const printer = new Vertex({
  id: 'printer',
  compute: (props: string) => console.log(props),
});

const reviewer = new Vertex({
  id: 'reviewer',
  compute: (props: string) => console.log(props),
});

const builder = new Graph<Context>()
  .addV(writer)
  .addV(printer)
  .addV(reviewer)
  .addE(writer, () => [printer, reviewer]);

const graph = builder.build({ context: { userId: '123' } });

// Start the graph from the writer vertex
graph.run([{ next: 'writer', props: { name: 'Alice' } }], {});
```

### Conditional Edge

```typescript
// change reviewer vertex to ⬇️
const reviewer = new Vertex({
  id: 'reviewer',
  compute: (props: string) => {
    if (!props.toLowerCase().includes('world')) {
      return { data: props, status: 'approved' };
    } else {
      return { data: props, status: 'rejected' };
    }
  },
});

const publisher = new Vertex({
  id: 'publisher',
  compute: async (props: { data: string }) => {
    console.log('Publishing...')
    console.log(props.data);
  },
});

const builder = new Graph<Context>()
  .addV(writer)
  .addV(printer)
  .addV(reviewer)
  .addE(writer, () => [printer, reviewer])
  .addE(reviewer, (props) => {
    if (props.status === 'approved') {
      return [publisher];
    } else {
      return [];
    }
  });

const graph = builder.build({ context: { userId: '123' } });

// Start the graph from the writer vertex
graph.run([{ next: 'writer', props: { name: 'Alice' } }], {});
```

## Agent Graph vs Langgraph

Agent Graph was inspired by langgraph, but there are some differences:

- Langgraph is not easy to deploy in Serverless environments, and customizing the persistence of graph state is difficult.
- The Graph defined by Langgraph must start from the start node, and does not support running from any node. Debugging is inconvenient when the workflow is relatively long.
- Langgraph uses global Annotations to define stored state, does not support Vertex local state, and state management is difficult when there are many nodes.
- Data cannot be passed between nodes on demand, for example, the user service node should not and does not need to access the order data of the billing service.
- Vendor lock-in, graph debugging depends on Langsmith, the Langgraph platform.

[//]: # (## Mapper Vertex)
