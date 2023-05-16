import {
  Adapter,
  JsEdgeParameters,
  JsContext,
  ContextAndValue,
  ContextAndNeighborsIterator,
  ContextAndBool,
  Schema,
  initialize,
  executeQuery,
} from '../../www2/trustfall_wasm';
import debug from '../utils/debug';
import HN_SCHEMA from './schema.graphql';
import { Webpage } from './data/Webpage';
import * as sources from './data/sources';

initialize(); // Trustfall query system init.

console.log('loading schema');
const SCHEMA = Schema.parse(HN_SCHEMA);
console.log('schema loaded');
debug('Schema loaded.');

postMessage('ready');

export class MyAdapter implements Adapter<Webpage> {
  fetchPort: MessagePort;

  constructor(fetchPort: MessagePort) {
    this.fetchPort = fetchPort;
  }

  *resolveStartingVertices(edge: string, parameters: JsEdgeParameters): IterableIterator<Webpage> {
    try {
      const source = (sources as any)[edge];
      if (!source) throw new Error(`sources[${edge}] doesn't exist`);
      yield* source(parameters);
    } catch (e) {
      console.trace({ edge, parameters });
      throw e;
    }
  }

  *resolveProperty(
    contexts: IterableIterator<JsContext<Webpage>>,
    type_name: string,
    field_name: string
  ): IterableIterator<ContextAndValue> {
    for (const ctx of contexts) {
      const vertex = ctx.activeVertex;
      if (vertex === null) continue;

      if (!(field_name in vertex)) {
        throw new Error(`[User] Can't call vertex.${field_name}() on "${JSON.stringify(vertex)}"`);
      }

      try {
        // console.log({ resolveProperty: { type_name, field_name, vertex } });
        yield {
          localId: ctx.localId,
          value: (vertex as any)[field_name](),
        };
      } catch (e) {
        console.trace({ type_name, field_name, vertex });
        throw e;
      }
    }
  }

  *resolveNeighbors(
    contexts: IterableIterator<JsContext<Webpage>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type_name: string,
    edge_name: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parameters: JsEdgeParameters
  ): IterableIterator<ContextAndNeighborsIterator<Webpage>> {
    for (const ctx of contexts) {
      const vertex = ctx.activeVertex;
      if (vertex === null) continue;

      if (!(edge_name in vertex)) {
        throw new Error(
          `[Neighbors] Can't call vertex.${edge_name}() on "${JSON.stringify(vertex)}"`
        );
      }

      try {
        // console.log({ resolveNeighbors: { type_name, edge_name, parameters, vertex } });
        yield {
          localId: ctx.localId,
          neighbors: (vertex as any)[edge_name]() || null,
        };
      } catch (e) {
        console.trace({ vertex, edge_name, type_name, parameters });
        throw e;
      }
    }
  }

  *resolveCoercion(
    contexts: IterableIterator<JsContext<Webpage>>,
    type_name: string,
    coerce_to_type: string
  ): IterableIterator<ContextAndBool> {
    for (const ctx of contexts) {
      const vertex = ctx.activeVertex;
      try {
        yield {
          localId: ctx.localId,
          value: vertex?.__typename?.() === coerce_to_type,
        };
      } catch (e) {
        console.trace({ vertex, coerce_to_type, type_name });
        throw e;
      }
    }
  }
}

let _adapterFetchChannel: MessagePort;
let _resultIter: IterableIterator<object>;

function performQuery(query: string, args: Record<string, any>): IterableIterator<object> {
  if (query == null || query == undefined) {
    throw new Error(`Cannot perform null/undef query.`);
  }
  if (args == null || args == undefined) {
    throw new Error(`Cannot perform query with null/undef args.`);
  }

  const adapter = new MyAdapter(_adapterFetchChannel);
  const resultIter = executeQuery(SCHEMA, adapter, query, args);

  return resultIter;
}

type AdapterMessage =
  | {
      op: 'init';
    }
  | {
      op: 'channel';
      data: {
        port: MessagePort;
      };
    }
  | {
      op: 'query';
      query: string;
      args: object;
    }
  | {
      op: 'next';
    };

let actionCounter = 1;

function dispatch(e: MessageEvent<AdapterMessage>): void {
  const payload = e.data;

  debug('Adapter received message:', payload);
  if (payload.op === 'init') {
    return;
  }

  if (payload.op === 'channel') {
    _adapterFetchChannel = payload.data.port;
    (globalThis as any).fetchPort = payload.data.port;
    return;
  }

  if (payload.op === 'query') {
    try {
      _resultIter = performQuery(payload.query, payload.args);
    } catch (e) {
      debug('error running query: ', e);
      debug(e);
      const result = {
        status: 'error',
        error: `${e}`,
      };
      postMessage(result);
      debug('result posted');
      return;
    }
  }

  if (payload.op === 'query' || payload.op === 'next') {
    const action = actionCounter++;
    console.time(`IteratorNext: ${action}`);
    const rawResult = _resultIter.next();
    const result = {
      status: 'success',
      done: rawResult.done,
      value: rawResult.value,
    };
    postMessage(result);
    console.timeEnd(`IteratorNext: ${action}`);
    return;
  }
}

onmessage = dispatch;
