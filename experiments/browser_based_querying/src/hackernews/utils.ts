import { SyncContext } from '../sync';
import { Comment } from './data/Comment';
import { GithubAccount } from './data/GithubAccount';
import { GithubOrganization } from './data/GithubOrganization';
import { GithubPullRequest } from './data/GithubPullRequest';
import { GithubRepository } from './data/GithubRepository';
import { GithubUser } from './data/GithubUser';
import { Item } from './data/Item';
import { Job } from './data/Job';
import { Story } from './data/Story';
import { User } from './data/User';
import { syncFetch } from './data/datautils';

export function materializeItem(itemId: number): Item | null {
  const item = syncFetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);

  if (item === null) {
    return null;
  }

  switch (item.type) {
    case 'comment':
      return new Comment(itemId, item);
    case 'story':
      return new Story(itemId, item);
    case 'job':
      return new Job(itemId, item);
    default:
      return new Item(itemId, item);
  }
}

export function materializeUser(username: string): User | null {
  return User.make(username);
}

export function materializeGithubPullRequest(
  owner: string,
  repo: string,
  number: string
): GithubPullRequest | null {
  return GithubPullRequest.make(owner, repo, number);
}

export function materializeGithubAccount(username: string): GithubAccount | null {
  const accountData = syncFetch(`https://api.github.com/users/${username}`);
  if (accountData === null) return null;
  switch (accountData.type) {
    case 'User':
      return new GithubUser(username, accountData);
    case 'Organization':
      return new GithubOrganization(username, accountData);
    default:
      throw new Error(`Unexpected github account type: ${accountData.type}`);
  }
}

export function materializeGithubRepository(owner: string, title: string): GithubRepository | null {
  return GithubRepository.make(owner, title);
}

function* yieldMaterializedItems(fetchPort: MessagePort, itemIds: number[]): Generator<Item> {
  for (const id of itemIds) {
    const item = materializeItem(id);
    const itemType = item?.type();

    // Ignore polls. They are very rarely made on HackerNews,
    // and they are not supported in our query schema.
    if (itemType === 'story' || itemType === 'job') {
      yield item as Item;
    }
  }
}

function* resolveListOfItems(fetchPort: MessagePort, url: string): Generator<Item> {
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
  const itemIds = JSON.parse(result);

  yield* yieldMaterializedItems(fetchPort, itemIds);
}

export function* getTopItems(fetchPort: MessagePort): Generator<Item> {
  const url = 'https://hacker-news.firebaseio.com/v0/topstories.json';
  yield* resolveListOfItems(fetchPort, url);
}

export function* getLatestItems(fetchPort: MessagePort): Generator<Item> {
  const url = 'https://hacker-news.firebaseio.com/v0/newstories.json';
  yield* resolveListOfItems(fetchPort, url);
}

export function* getBestItems(fetchPort: MessagePort): Generator<Item> {
  const url = 'https://hacker-news.firebaseio.com/v0/beststories.json';
  yield* resolveListOfItems(fetchPort, url);
}

export function* getAskStories(fetchPort: MessagePort): Generator<Item> {
  const url = 'https://hacker-news.firebaseio.com/v0/askstories.json';
  yield* resolveListOfItems(fetchPort, url);
}

export function* getShowStories(fetchPort: MessagePort): Generator<Item> {
  const url = 'https://hacker-news.firebaseio.com/v0/showstories.json';
  yield* resolveListOfItems(fetchPort, url);
}

export function* getJobItems(fetchPort: MessagePort): Generator<Item> {
  const url = 'https://hacker-news.firebaseio.com/v0/jobstories.json';
  yield* resolveListOfItems(fetchPort, url);
}

export function* getUpdatedItems(fetchPort: MessagePort): Generator<Item> {
  const url = 'https://hacker-news.firebaseio.com/v0/updates.json';
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
  const itemIds = JSON.parse(result)?.items;

  yield* yieldMaterializedItems(fetchPort, itemIds);
}

export function* getUpdatedUserProfiles(): Generator<User> {
  const { profiles: usernames } = syncFetch('https://hacker-news.firebaseio.com/v0/updates.json');

  for (const username of usernames) {
    const user = materializeUser(username);
    if (user) {
      yield user;
    }
  }
}

function* getSearchResults(endpoint: string, query: string): Generator<Item> {
  const hitsPerPage = '50';
  let nextPage = 0;

  while (true) {
    const params = new URLSearchParams([
      ['query', query],
      ['page', nextPage.toString()],
      ['hitsPerPage', hitsPerPage],
    ]);
    nextPage += 1;
    const { hits } = syncFetch(`https://hn.algolia.com/api/v1/${endpoint}?${params}`);

    if (hits?.length) {
      for (const hit of hits) {
        const itemId = hit.objectID;
        if (itemId) {
          const item = materializeItem(itemId);
          if (item) {
            yield item;
          }
        }
      }
    } else {
      break;
    }
  }
}

export function* getRelevanceSearchResults(query: string): Generator<Item> {
  yield* getSearchResults('search', query);
}

export function* getDateSearchResults(query: string): Generator<Item> {
  yield* getSearchResults('search_by_date', query);
}
