import { SyncContext } from '../../sync';
import { decode } from 'html-entities';
import { Webpage } from './Webpage';
import { materializeItem, materializeWebsite } from '../utils';

declare const fetchPort: MessagePort;

let fetchCtr = 1;

export function syncFetch(url: string): any | null {
  const sync = SyncContext.makeDefault();

  const fetchOptions: Partial<RequestInit> = {
    method: 'GET',
  };

  if (url.startsWith('https://api.github.com')) {
    fetchOptions.headers ??= {};
    const headers = fetchOptions.headers as any;
    headers.Authorization = `Bearer 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`;
    headers['X-GitHub-Api-Version'] = '2022-11-28';
    headers.Accept = 'application/vnd.github+json';
  }

  const message = {
    sync: sync.makeSendable(),
    input: url,
    init: fetchOptions,
  };
  fetchPort.postMessage(message);

  const i = fetchCtr++;
  const lbl = `fetch ${i}: ${url}`;

  console.time(lbl);

  const recv = sync.receive();
  const result = new TextDecoder().decode(recv);
  const user = JSON.parse(result);

  console.timeEnd(lbl);

  return user;
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

export function* linksInAboutPage(aboutHtml: string | null): Generator<Webpage> {
  if (aboutHtml === null) return;

  const processedLinks: Record<string, boolean> = {};

  const matches1 = aboutHtml.matchAll(/<a [^>]*href="([^"]+)"[^>]*>/g);
  for (const match of matches1) {
    // We matched the HTML-escaped URL. Decode the HTML entities.
    const url = decode(match[1]);

    if (!processedLinks[url]) {
      processedLinks[url] = true;
      const vertex = materializeWebsite(url);
      if (vertex) {
        yield vertex;
      }
    }
  }

  const aboutPlain = extractPlainTextFromHnMarkup(aboutHtml);
  const matches2 = aboutPlain.matchAll(/http[s]?:\/\/[^ \n\t]*[^ \n\t.);,\]}]/g);
  for (const match of matches2) {
    // We matched the unescaped URL.
    const url = match[0];

    if (!processedLinks[url]) {
      processedLinks[url] = true;
      const vertex = materializeWebsite(url);
      if (vertex) {
        yield vertex;
      }
    }
  }
}

export function* linksInHnMarkup(hnText: string | null): Generator<Webpage> {
  if (hnText) {
    const matches = hnText.matchAll(/<a [^>]*href="([^"]+)"[^>]*>/g);
    for (const match of matches) {
      // We matched the HTML-escaped URL. Decode the HTML entities.
      const url = decode(match[1]);
      const vertex = materializeWebsite(url);
      if (vertex) {
        yield vertex;
      }
    }
  }
}

export function* resolveListOf<T>(url: string, materializer: (id: any) => T): Generator<T> {
  const itemIds: number[] = syncFetch(url);

  for (const id of itemIds) {
    const item = materializer(id);
    if (item !== null) yield item;

    // Ignore polls. They are very rarely made on HackerNews,
    // and they are not supported in our query schema.
    // U9G: We just default to Item for those

    // if (itemType === 'story' || itemType === 'job') {
    //   yield item as Item;
    // }
  }
}

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

export function* limitedListIterator<T>(
  url: string,
  limit: number | undefined,
  materializer: (id: any) => T
): IterableIterator<any> {
  const iter = resolveListOf(url, materializer);

  if (limit != null) {
    yield* limitIterator(iter, limit);
  } else {
    yield* iter;
  }
}

export function* hackernewsAlgoliaSearch(endpoint: string, query: string) {
  let page = 0;
  while (true) {
    const params = new URLSearchParams({
      query: query,
      page: (page++).toString(),
      hitsPerPage: '50',
    }).toString();

    const { hits } = syncFetch(`https://hn.algolia.com/api/v1/${endpoint}?${params}`);
    if (!hits?.length) return;

    for (const { objectID: itemId } of hits) {
      const item = materializeItem(itemId);
      if (item !== null) yield item;
    }
  }
}
