import { materializeItem } from '../utils';
import { Item } from './Item';
import { Webpage } from './Webpage';
import { extractPlainTextFromHnMarkup, linksInAboutPage, syncFetch } from './datautils';

export class User extends Webpage {
  #data: {
    id: number;
    karma: number;
    about: string;
    created: number;
    submitted: number[];
  };
  private constructor(username: string, data: any) {
    super(`https://news.ycombinator.com/user?id=${username}`);
    this.#data = data;
  }

  static make(username: string): User | null {
    const userData = syncFetch(`https://hacker-news.firebaseio.com/v0/user/${username}.json`);
    if (userData === null) return null;

    return new User(username, userData);
  }

  id(): number {
    return this.#data.id;
  }
  karma(): number {
    return this.#data.karma;
  }
  aboutHtml(): string | null {
    return this.#data.about;
  }
  aboutPlain(): string | null {
    const html = this.aboutHtml();
    if (html === null) return null;

    return extractPlainTextFromHnMarkup(html);
  }
  unixCreatedAt(): number {
    return this.#data.created;
  }
  *submitted(): IterableIterator<Item> {
    for (const submitted of this.#data.submitted) {
      const result = materializeItem(submitted);
      if (result != null) {
        yield result;
      }
    }
  }
  *link(): IterableIterator<Webpage> {
    yield* linksInAboutPage(this.aboutHtml());
  }

  __typename = () => 'User';
}
