import { decode } from 'html-entities';
import { Webpage } from './Webpage';
import { materializeItem, materializeWebsite } from '../utils';
import { Story } from './Story';
import { syncFetch } from '../syncfetcher';
import { AlgoliaSearchResult } from '../sources/algolia_search';

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

export function* limitIterator<T>(iter: IterableIterator<T>, limit: number): IterableIterator<T> {
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

function* hackernewsAlgoliaFetcher(
  endpoint: string,
  params: Record<string, string>
): IterableIterator<any> {
  let page = 0;

  while (true) {
    const paramsStr = new URLSearchParams({
      page: (page++).toString(),
      hitsPerPage: '200',
      ...params,
    }).toString();

    const { hits } = syncFetch(`https://hn.algolia.com/api/v1/${endpoint}?${paramsStr}`);
    if (!hits?.length) return;

    for (const hit of hits) {
      yield hit;
    }
  }
}

export function* hackernewsAlgoliaSearch(endpoint: string, query: string) {
  const f = hackernewsAlgoliaFetcher(endpoint, { query });
  for (const { objectID: itemId } of f) {
    const item = materializeItem(itemId);
    if (item !== null) yield item;
  }
}

export function* hackernewsAlgoliaLatest() {
  const f = hackernewsAlgoliaFetcher('search_by_date', { tags: 'story' });
  for (const hit of f) {
    yield new Story(hit.objectID, { algolia: hit as AlgoliaSearchResult });
  }
}
