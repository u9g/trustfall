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
  JsFieldValue,
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
  materializeItem,
  materializeUser,
} from './utils';
import HN_SCHEMA from './schema.graphql';

initialize(); // Trustfall query system init.

const SCHEMA = Schema.parse(HN_SCHEMA);
debug('Schema loaded.');

postMessage('ready');

type Vertex = any;

type In = IterableIterator<JsContext<Vertex>>;
type Out<T extends JsFieldValue = JsFieldValue> = IterableIterator<ContextAndValue<T>>;

function* item_url(data: In): Out {
  for (const { localId, activeVertex } of data) {
    if (!activeVertex) yield { value: null, localId };

    yield { value: `https://news.ycombinator.com/item?id=${activeVertex.id}`, localId };
  }
}

function* id(data: In): Out {
  for (const { localId, activeVertex } of data) {
    yield { value: activeVertex?.id ?? null, localId };
  }
}

function* unixTime(data: In): Out {
  for (const { localId, activeVertex } of data) {
    yield { value: activeVertex?.time ?? null, localId };
  }
}

function* byUsername(data: In): Out {
  for (const { localId, activeVertex } of data) {
    yield { value: activeVertex?.by ?? null, localId };
  }
}

function* title(data: In): Out {
  for (const { localId, activeVertex } of data) {
    yield { value: activeVertex?.title ?? null, localId };
  }
}

function* score(data: In): Out {
  for (const { localId, activeVertex } of data) {
    yield { value: activeVertex?.score ?? null, localId };
  }
}

function* textHtml(data: In): Out<string | null> {
  for (const { localId, activeVertex } of data) {
    yield { value: activeVertex?.text ?? null, localId };
  }
}

function* textPlain(data: In): Out {
  for (const { localId, value } of textHtml(data)) {
    yield { value: extractPlainTextFromHnMarkup(value) ?? null, localId };
  }
}

function* submittedUrl(data: In): Out {
  for (const { localId, activeVertex } of data) {
    yield { value: activeVertex?.url ?? null, localId };
  }
}

function* user_aboutHtml(data: In): Out<string | null> {
  for (const { localId, activeVertex } of data) {
    yield { value: activeVertex?.about ?? null, localId };
  }
}

const vertices: Record<string, Record<string, (data: In) => Out>> = {
  Webpage: {
    url: function* (data) {
      for (const { localId, activeVertex } of data) {
        yield { value: activeVertex?.url ?? null, localId };
      }
    },
  },
  Item: {
    id,
    unixTime,
    url: item_url,
  },
  Story: {
    id,
    unixTime,
    url: item_url,
    byUsername,
    score,
    textHtml,
    textPlain,
    title,
    submittedUrl,
  },
  Comment: {
    id,
    unixTime,
    url: item_url,
    textHtml,
    textPlain,
    byUsername,
  },
  User: {
    id,
    karma: function* (data) {
      for (const { localId, activeVertex } of data) {
        yield { value: activeVertex?.karma ?? null, localId };
      }
    },
    aboutHtml: user_aboutHtml,
    aboutPlain: function* (data) {
      for (const { localId, value } of user_aboutHtml(data)) {
        yield { value: extractPlainTextFromHnMarkup(value), localId };
      }
    },
    unixCreatedAt: function* (data) {
      for (const { localId, activeVertex } of data) {
        yield { value: activeVertex?.created ?? null, localId };
      }
    },
    url: function* (data) {
      for (const { localId, activeVertex } of data) {
        if (!activeVertex) yield { value: null, localId };

        yield { value: `https://news.ycombinator.com/user?id=${activeVertex.id}`, localId };
      }
    },
  },
  Job: {
    id,
    unixTime,
    url: item_url,
    title,
  },
};

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

const _itemPattern = /^https:\/\/news\.ycombinator\.com\/item\?id=(\d+)$/;
const _userPattern = /^https:\/\/news\.ycombinator\.com\/user\?id=(.+)$/;

function materializeWebsite(fetchPort: MessagePort, url: string): Vertex | null {
  let matcher: RegExpMatchArray | null = null;
  let ret: { url: string; __typename: string } | null = null;
  if ((matcher = url.match(_itemPattern))) {
    // This is an item.
    const item = materializeItem(fetchPort, parseInt(matcher[1]));
    if (item != null) {
      ret = { url, ...item };
    }
  } else if ((matcher = url.match(_userPattern))) {
    // This is a user.
    const user = materializeUser(fetchPort, matcher[1]);
    if (user != null) {
      ret = { url, ...user };
    }
  } else {
    ret = { url, __typename: 'Website' };
  }

  return ret;
}

function* linksInHnMarkup(fetchPort: MessagePort, hnText: string | null): IterableIterator<Vertex> {
  if (hnText) {
    const matches = hnText.matchAll(/<a [^>]*href="([^"]+)"[^>]*>/g);
    for (const match of matches) {
      // We matched the HTML-escaped URL. Decode the HTML entities.
      const url = decode(match[1]);
      const vertex = materializeWebsite(fetchPort, url);
      if (vertex) {
        yield vertex;
      }
    }
  }
}

function* linksInAboutPage(
  fetchPort: MessagePort,
  aboutHtml: string | null
): IterableIterator<Vertex> {
  if (aboutHtml) {
    const processedLinks: Record<string, boolean> = {};

    const matches1 = aboutHtml.matchAll(/<a [^>]*href="([^"]+)"[^>]*>/g);
    for (const match of matches1) {
      // We matched the HTML-escaped URL. Decode the HTML entities.
      const url = decode(match[1]);

      if (!processedLinks[url]) {
        processedLinks[url] = true;
        const vertex = materializeWebsite(fetchPort, url);
        if (vertex) {
          yield vertex;
        }
      }
    }

    const aboutPlain = extractPlainTextFromHnMarkup(aboutHtml);
    const matches2 = aboutPlain.matchAll(/http[s]?:\/\/[^ \n\t]*[^ \n\t\.);,\]}]/g);
    for (const match of matches2) {
      // We matched the unescaped URL.
      const url = match[0];

      if (!processedLinks[url]) {
        processedLinks[url] = true;
        const vertex = materializeWebsite(fetchPort, url);
        if (vertex) {
          yield vertex;
        }
      }
    }
  }
}

export function extractPlainTextFromHnMarkup<T extends string | null>(hnText: T): T {
  // HN comments are not-quite-HTML: they support italics, links, paragraphs,
  // and preformatted text (code blocks), and use HTML escape sequences.
  // Docs: https://news.ycombinator.com/formatdoc
  if (hnText === null) return null as T;
  return decode(
    hnText
      .replaceAll('</a>', '') // remove closing link tags
      .replaceAll(/<a[^>]*>/g, '') // remove opening link tags
      .replaceAll(/<\/?(?:i|pre|code)>/g, '') // remove formatting tags
      .replaceAll('<p>', '\n') // turn paragraph tags into newlines
  ) as T;
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
    if (edge === 'FrontPage') {
      return limitIterator(getTopItems(this.fetchPort), 30);
    } else if (
      edge === 'Top' ||
      edge === 'Latest' ||
      edge === 'Best' ||
      edge === 'AskHN' ||
      edge === 'ShowHN' ||
      edge === 'RecentJob' ||
      edge === 'UpdatedItem' ||
      edge === 'UpdatedUserProfile'
    ) {
      const limit = parameters['max'] as number | undefined;
      let fetcher: (fetchPort: MessagePort) => IterableIterator<Vertex>;
      switch (edge) {
        case 'Top': {
          fetcher = getTopItems;
          break;
        }
        case 'Latest': {
          fetcher = getLatestItems;
          break;
        }
        case 'Best': {
          fetcher = getBestItems;
          break;
        }
        case 'AskHN': {
          fetcher = getAskStories;
          break;
        }
        case 'ShowHN': {
          fetcher = getShowStories;
          break;
        }
        case 'RecentJob': {
          fetcher = getJobItems;
          break;
        }
        case 'UpdatedItem': {
          fetcher = getUpdatedItems;
          break;
        }
        case 'UpdatedUserProfile': {
          fetcher = getUpdatedUserProfiles;
          break;
        }
      }
      yield* resolvePossiblyLimitedIterator(fetcher(this.fetchPort), limit);
    } else if (edge === 'User') {
      const username = parameters['name'] as string;
      const user = materializeUser(this.fetchPort, username);
      if (user != null) {
        yield user;
      }
    } else if (edge === 'Item') {
      const id = parameters['id'] as number;
      const item = materializeItem(this.fetchPort, id);
      if (item != null) {
        yield item;
      }
    } else if (edge === 'SearchByRelevance' || edge === 'SearchByDate') {
      const query = parameters['query'] as string;
      switch (edge) {
        case 'SearchByRelevance': {
          yield* getRelevanceSearchResults(this.fetchPort, query);
          break;
        }
        case 'SearchByDate': {
          yield* getDateSearchResults(this.fetchPort, query);
          break;
        }
      }
    } else {
      throw new Error(`Unexpected edge ${edge} with params ${parameters}`);
    }
  }

  *resolveProperty(
    contexts: IterableIterator<JsContext<Vertex>>,
    type_name: string,
    field_name: string
  ): IterableIterator<ContextAndValue> {
    const fn = vertices[type_name][field_name];
    if (fn) {
      yield* fn(contexts);
    } else {
      throw new Error(`Unexpected type+property for type ${type_name}: ${field_name}`);
    }
  }

  *resolveNeighbors(
    contexts: IterableIterator<JsContext<Vertex>>,
    type_name: string,
    edge_name: string,
    parameters: JsEdgeParameters
  ): IterableIterator<ContextAndNeighborsIterator<Vertex>> {
    if (type_name === 'Story' || type_name === 'Job' || type_name === 'Comment') {
      if (edge_name === 'link') {
        if (type_name === 'Story') {
          // Link submission stories have the submitted URL as a link.
          // Text submission stories can have multiple links in the text.
          for (const ctx of contexts) {
            const vertex = ctx.activeVertex;
            let neighbors: IterableIterator<Vertex>;
            if (vertex) {
              if (vertex.url) {
                // link submission
                const neighbor = materializeWebsite(this.fetchPort, vertex.url);
                if (neighbor) {
                  neighbors = [neighbor][Symbol.iterator]();
                } else {
                  neighbors = [][Symbol.iterator]();
                }
              } else {
                // text submission
                neighbors = linksInHnMarkup(this.fetchPort, vertex.text);
              }
            } else {
              neighbors = [][Symbol.iterator]();
            }
            yield {
              localId: ctx.localId,
              neighbors,
            };
          }
        } else if (type_name === 'Comment') {
          // Comments can only have links in their text content.
          for (const ctx of contexts) {
            const vertex = ctx.activeVertex;
            let neighbors: IterableIterator<Vertex>;
            if (vertex) {
              neighbors = linksInHnMarkup(this.fetchPort, vertex.text);
            } else {
              neighbors = [][Symbol.iterator]();
            }
            yield {
              localId: ctx.localId,
              neighbors,
            };
          }
        } else if (type_name === 'Job') {
          // Jobs only have the submitted URL as a link.
          for (const ctx of contexts) {
            const vertex = ctx.activeVertex;
            let neighbors: IterableIterator<Vertex> = [][Symbol.iterator]();
            if (vertex) {
              const neighbor = materializeWebsite(this.fetchPort, vertex.url);
              if (neighbor) {
                neighbors = [neighbor][Symbol.iterator]();
              }
            }
            yield {
              localId: ctx.localId,
              neighbors,
            };
          }
        } else {
          throw new Error(`Not implemented: ${type_name} ${edge_name} ${parameters}`);
        }
      } else if (edge_name === 'byUser') {
        for (const ctx of contexts) {
          const vertex = ctx.activeVertex;
          if (vertex) {
            yield {
              localId: ctx.localId,
              neighbors: lazyFetchMap(this.fetchPort, [vertex.by], materializeUser),
            };
          } else {
            yield {
              localId: ctx.localId,
              neighbors: [][Symbol.iterator](),
            };
          }
        }
      } else if (edge_name === 'comment' || edge_name === 'reply') {
        for (const ctx of contexts) {
          const vertex = ctx.activeVertex;
          yield {
            localId: ctx.localId,
            neighbors: lazyFetchMap(this.fetchPort, vertex?.kids, materializeItem),
          };
        }
      } else if (edge_name === 'parent') {
        for (const ctx of contexts) {
          const vertex = ctx.activeVertex;
          const parent = vertex?.parent;
          if (parent) {
            yield {
              localId: ctx.localId,
              neighbors: lazyFetchMap(this.fetchPort, [parent], materializeItem),
            };
          } else {
            yield {
              localId: ctx.localId,
              neighbors: [][Symbol.iterator](),
            };
          }
        }
      } else {
        throw new Error(`Not implemented: ${type_name} ${edge_name} ${parameters}`);
      }
    } else if (type_name === 'User') {
      if (edge_name === 'submitted') {
        for (const ctx of contexts) {
          const vertex = ctx.activeVertex;
          const submitted = vertex?.submitted;
          yield {
            localId: ctx.localId,
            neighbors: lazyFetchMap(this.fetchPort, submitted, materializeItem),
          };
        }
      } else if (edge_name === 'link') {
        for (const ctx of contexts) {
          const vertex = ctx.activeVertex;
          let neighbors: IterableIterator<Vertex> = [][Symbol.iterator]();
          const aboutHtml = vertex?.about;
          if (aboutHtml) {
            neighbors = linksInAboutPage(this.fetchPort, aboutHtml);
          }
          yield {
            localId: ctx.localId,
            neighbors,
          };
        }
      } else {
        throw new Error(`Not implemented: ${type_name} ${edge_name} ${parameters}`);
      }
    } else {
      throw new Error(`Not implemented: ${type_name} ${edge_name} ${parameters}`);
    }
  }

  *resolveCoercion(
    contexts: IterableIterator<JsContext<Vertex>>,
    type_name: string,
    coerce_to_type: string
  ): IterableIterator<ContextAndBool> {
    if (type_name === 'Item' || type_name === 'Webpage') {
      if (coerce_to_type === 'Item') {
        // The Item type is abstract, we need to check if the vertex is any of the Item subtypes.
        for (const ctx of contexts) {
          const vertex = ctx.activeVertex;
          const type = vertex?.__typename;
          yield {
            localId: ctx.localId,
            value: type === 'Story' || type === 'Job' || type === 'Comment',
          };
        }
      } else {
        for (const ctx of contexts) {
          const vertex = ctx.activeVertex;
          yield {
            localId: ctx.localId,
            value: vertex?.__typename === coerce_to_type,
          };
        }
      }
    } else {
      throw new Error(`Unexpected coercion from ${type_name} to ${coerce_to_type}`);
    }
  }
}

function* lazyFetchMap<InT, OutT>(
  fetchPort: MessagePort,
  inputs: Array<InT> | null,
  func: (port: MessagePort, arg: InT) => OutT
): IterableIterator<OutT> {
  if (inputs) {
    for (const input of inputs) {
      const result = func(fetchPort, input);
      if (result != null) {
        yield result;
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
