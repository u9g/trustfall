//   """
//   Items on the front page of HackerNews. Equivalent to Top(max: 30).
//   """

import { materializeItem, materializeUser } from '../utils';
import { Item as HNItem } from './Item';
import { Job } from './Job';
import { Story } from './Story';
import { User as HNUser } from './User';
import { hackernewsAlgoliaSearch, limitedListIterator, syncFetch } from './datautils';

//   FrontPage: [Item!]!
export function* FrontPage(): IterableIterator<HNItem> {
  yield* Top({ max: 30 });
}
//   """
//   The top items on HackerNews. Items on the front page are the top 30.

//   The `max` parameter can be used to limit queries to the selected number
//   of topmost items. Otherwise, queries will continue fetching top items
//   as deep as the HackerNews API allows.
//   """
//   Top(max: Int): [Item!]!
export function* Top({ max }: { max?: number }): IterableIterator<HNItem> {
  yield* limitedListIterator(
    'https://hacker-news.firebaseio.com/v0/topstories.json',
    max,
    materializeItem
  );
}

//   """
//   Latest story submissions on HackerNews.

//   The `max` parameter can be used to limit queries to the selected number
//   of latest items. Otherwise, queries will continue fetching latest stories
//   as deep as the HackerNews API allows.
//   """
//   Latest(max: Int): [Story!]!
export function* Latest({ max }: { max?: number } = {}): IterableIterator<Story> {
  yield* limitedListIterator(
    'https://hacker-news.firebaseio.com/v0/newstories.json',
    max,
    materializeItem
  );
}

//   """
//   Best (recent & most highly-rated) story submissions on HackerNews.

//   The `max` parameter can be used to limit queries to the selected number
//   of latest items. Otherwise, queries will continue fetching stories
//   as deep as the HackerNews API allows.
//   """
//   Best(max: Int): [Story!]!
export function* Best({ max }: { max?: number } = {}): IterableIterator<Story> {
  yield* limitedListIterator(
    'https://hacker-news.firebaseio.com/v0/beststories.json',
    max,
    materializeItem
  );
}

//   """
//   Most recent "Ask HN" story submissions.

//   The `max` parameter can be used to limit queries to the selected number
//   of latest items. Otherwise, queries will continue fetching stories
//   as deep as the HackerNews API allows.
//   """
//   AskHN(max: Int): [Story!]!
export function* AskHN({ max }: { max?: number } = {}): IterableIterator<Story> {
  yield* limitedListIterator(
    'https://hacker-news.firebaseio.com/v0/askstories.json',
    max,
    materializeItem
  );
}

//   """
//   Most recent "Show HN" story submissions.
//   The `max` parameter can be used to limit queries to the selected number
//   of latest items. Otherwise, queries will continue fetching stories
//   as deep as the HackerNews API allows.
//   """
//   ShowHN(max: Int): [Story!]!
export function* ShowHN({ max }: { max?: number } = {}): IterableIterator<Story> {
  yield* limitedListIterator(
    'https://hacker-news.firebaseio.com/v0/showstories.json',
    max,
    materializeItem
  );
}
//   """
//   Most recent Job submissions.
//   The `max` parameter can be used to limit queries to the selected number
//   of latest items. Otherwise, queries will continue fetching jobs
//   as deep as the HackerNews API allows.
//   """
//   RecentJob(max: Int): [Story!]!
export function* RecentJob({ max }: { max?: number } = {}): IterableIterator<Job> {
  yield* limitedListIterator(
    'https://hacker-news.firebaseio.com/v0/jobstories.json',
    max,
    materializeItem
  );
}
//   """
//   Look up a user by their username.
//   """
//   User(name: String!): User
export function* User({ name }: { name: string }): IterableIterator<HNUser> {
  const user = materializeUser(name);
  if (user !== null) yield user;
}
//   """
//   Look up an item by its ID number.
//   """
//   Item(id: Int!): Item
export function* Item({ id }: { id: number }): IterableIterator<HNItem> {
  const result = materializeItem(id);
  if (result !== null) yield result;
}
//   """
//   Most-recently updated items, such as stories or job postings.

//   The `max` parameter can be used to limit queries to the selected number
//   of latest items. Otherwise, queries will continue fetching items
//   as deep as the HackerNews API allows.
//   """
//   UpdatedItem(max: Int): [Item!]!
export function* UpdatedItem({ max }: { max?: number } = {}): IterableIterator<HNItem> {
  yield* limitedListIterator(
    'https://hacker-news.firebaseio.com/v0/updates.json',
    max,
    materializeItem
  );
}
//   """
//   Most-recently updated user profiles.
//   The `max` parameter can be used to limit queries to the selected number
//   of latest items. Otherwise, queries will continue fetching items
//   as deep as the HackerNews API allows.
//   """
//   UpdatedUserProfile(max: Int): [User!]!
export function* UpdatedUserProfile({ max }: { max?: number } = {}): IterableIterator<HNUser> {
  yield* limitedListIterator(
    'https://hacker-news.firebaseio.com/v0/updates.json',
    max,
    materializeUser
  );
}
//   """
//   Use HackerNews search to find items (stories, comments, etc.) based on the given query string.
//   Items are returned sorted by relevance, then points, then number of comments.
//   Search API docs: https://hn.algolia.com/api
//   """
//   SearchByRelevance(query: String!): [Item!]
export function* SearchByRelevance({ query }: { query: string }): IterableIterator<HNItem> {
  yield* hackernewsAlgoliaSearch('search', query);
}
//   """
//   Use HackerNews search to find items (stories, comments, etc.) based on the given query string.
//   Items are returned sorted by date, more recent first.
//   Search API docs: https://hn.algolia.com/api
//   """
//   SearchByDate(query: String!): [Item!]
export function* SearchByDate({ query }: { query: string }): IterableIterator<HNItem> {
  yield* hackernewsAlgoliaSearch('search_by_date', query);
}
