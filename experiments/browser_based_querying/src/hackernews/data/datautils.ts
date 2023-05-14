import { SyncContext } from '../../sync';
import { decode } from 'html-entities';
import { materializeWebsite } from '../adapter';
import { Webpage } from './Webpage';

declare const fetchPort: MessagePort;

export function syncFetch(url: string): any | null {
  const sync = SyncContext.makeDefault();

  const fetchOptions = {
    method: 'GET',
  };

  const message = {
    sync: sync.makeSendable(),
    input: url,
    init: fetchOptions,
  };
  fetchPort.postMessage(message);

  const result = new TextDecoder().decode(sync.receive());
  const user = JSON.parse(result);

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
