import { Webpage } from './Webpage';
import { AlgoliaSearchResult } from '../sources/algolia_search';
import { syncFetch } from '../syncfetcher';

type HN = { id: number; time: number; type: string };

export class Item<T extends HN = HN> extends Webpage {
  data: { hn: T } | { algolia: AlgoliaSearchResult };
  itemId: string;

  constructor(itemId: string, data: { algolia: AlgoliaSearchResult } | { hn: T }) {
    super(`https://news.ycombinator.com/item?id=${itemId}`);
    this.itemId = itemId;
    this.data = data;
  }

  id(): string {
    return this.itemId;
  }

  unixTime(): number {
    if ('hn' in this.data) {
      return this.data.hn.time;
    }
    return this.data.algolia.created_at_i;
  }

  type(): string {
    if ('hn' in this.data) {
      return this.data.hn.type;
    }
    return 'story';
  }

  protected materializePostData(): T {
    return syncFetch(`https://hacker-news.firebaseio.com/v0/item/${this.itemId}.json`);
  }

  __typename = () => 'Item';
}
