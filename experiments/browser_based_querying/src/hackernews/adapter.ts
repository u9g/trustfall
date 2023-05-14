import { decode } from 'html-entities';
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
import {
  getAskStories,
  getBestItems,
  getDateSearchResults,
  getJobItems,
  getLatestItems,
  getRelevanceSearchResults,
  getShowStories,
  getTopItems,
  getUpdatedItems,
  getUpdatedUserProfiles,
  materializeGithubAccount,
  materializeGithubPullRequest,
  materializeGithubRepository,
  materializeItem,
  materializeUser,
} from './utils';
import HN_SCHEMA from './schema.graphql';
import { Webpage } from './data/Webpage';
import * as sources from './data/sources';

initialize(); // Trustfall query system init.

console.log('loading schema');
const SCHEMA = Schema.parse(HN_SCHEMA);
console.log('schema loaded');
debug('Schema loaded.');

postMessage('ready');

function* limitIterator<T>(iter: IterableIterator<T>, limit: number): IterableIterator<T> {
  let count = 0;
  for (const item of iter) {
    yield item;
    count += 1;
    if (count == limit) {
      break;
    }
  }
}

type Vertex = any;

const _itemPattern = /^https:\/\/news\.ycombinator\.com\/item\?id=(\d+)$/;
const _userPattern = /^https:\/\/news\.ycombinator\.com\/user\?id=(.+)$/;

// github-username-regex (CC Zero v1) - /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
const _githubPullRequestPattern =
  /^https:\/\/github\.com\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/(.+)\/pull\/(\d+)$/;
const _githubAccountPattern = /^https:\/\/github\.com\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})$/;
const _githubRepoPattern = /^https:\/\/github\.com\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/(.+)$/;

export function materializeWebsite(url: string): Vertex | null {
  let matcher: RegExpMatchArray | null = null;
  let ret: any;
  if ((matcher = url.match(_itemPattern))) {
    // This is an item.
    ret = materializeItem(parseInt(matcher[1]));
  } else if ((matcher = url.match(_userPattern))) {
    // This is a user.
    ret = materializeUser(matcher[1]);
  } else if ((matcher = url.match(_githubPullRequestPattern))) {
    // This is a github pull request.
    ret = materializeGithubPullRequest(matcher[1], matcher[2], matcher[3]);
  } else if ((matcher = url.match(_githubAccountPattern))) {
    // This is a github profile.
    ret = materializeGithubAccount(matcher[1]);
  } else if ((matcher = url.match(_githubRepoPattern))) {
    // This is a github repository.
    ret = materializeGithubRepository(matcher[1], matcher[2]);
  } else {
    ret = new Webpage(url);
  }
  return ret;
}

function* resolvePossiblyLimitedIterator(
  iter: IterableIterator<Vertex>,
  limit: number | undefined
): IterableIterator<Vertex> {
  if (limit == undefined) {
    yield* iter;
  } else {
    yield* limitIterator(iter, limit as number);
  }
}

export class MyAdapter implements Adapter<Vertex> {
  fetchPort: MessagePort;

  constructor(fetchPort: MessagePort) {
    this.fetchPort = fetchPort;
  }

  *resolveStartingVertices(edge: string, parameters: JsEdgeParameters): IterableIterator<Vertex> {
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
    contexts: IterableIterator<JsContext<Vertex>>,
    type_name: string,
    field_name: string
  ): IterableIterator<ContextAndValue> {
    for (const ctx of contexts) {
      const vertex = ctx.activeVertex;
      if (!(field_name in vertex)) {
        throw new Error(`[User] Can't call vertex.${field_name}() on "${JSON.stringify(vertex)}"`);
      }
      try {
        yield {
          localId: ctx.localId,
          value: vertex[field_name]?.() || null,
        };
      } catch (e) {
        console.trace({ type_name, field_name, vertex });
        throw e;
      }
    }
  }

  *resolveNeighbors(
    contexts: IterableIterator<JsContext<Vertex>>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type_name: string,
    edge_name: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parameters: JsEdgeParameters
  ): IterableIterator<ContextAndNeighborsIterator<Vertex>> {
    for (const ctx of contexts) {
      const vertex = ctx.activeVertex;
      if (!(edge_name in vertex)) {
        throw new Error(
          `[Neighbors] Can't call vertex.${edge_name}() on "${JSON.stringify(vertex)}"`
        );
      }
      try {
        yield {
          localId: ctx.localId,
          neighbors: vertex[edge_name]?.() || null,
        };
      } catch (e) {
        console.trace({ vertex, edge_name, type_name });
        throw e;
      }
    }
  }

  *resolveCoercion(
    contexts: IterableIterator<JsContext<Vertex>>,
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
    const rawResult = _resultIter.next();
    const result = {
      status: 'success',
      done: rawResult.done,
      value: rawResult.value,
    };
    postMessage(result);
    return;
  }
}

onmessage = dispatch;
