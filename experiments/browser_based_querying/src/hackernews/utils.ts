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
import { Webpage } from './data/Webpage';
import { syncFetch } from './syncfetcher';

const _itemPattern = /^https:\/\/news\.ycombinator\.com\/item\?id=(\d+)$/;
const _userPattern = /^https:\/\/news\.ycombinator\.com\/user\?id=(.+)$/;

// github-username-regex (CC Zero v1) - /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
const _githubPullRequestPattern =
  /^https:\/\/github\.com\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/(.+)\/pull\/(\d+)$/;
const _githubAccountPattern = /^https:\/\/github\.com\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})$/;
const _githubRepoPattern =
  /^https:\/\/github\.com\/([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})\/([a-zA-Z0-9_]+)$/;

export function materializeWebsite(url: string): Webpage | null {
  let matcher: RegExpMatchArray | null = null;
  let ret: any;
  if ((matcher = url.match(_itemPattern))) {
    // This is an item.
    ret = materializeItem(matcher[1]);
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

export function materializeItem(itemId: string): Item | null {
  const item = syncFetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);

  if (item === null) {
    return null;
  }

  switch (item.type) {
    case 'comment':
      return new Comment(itemId, { hn: item });
    case 'story':
      return new Story(itemId, { hn: item });
    case 'job':
      return new Job(itemId, { hn: item });
    default:
      return new Item(itemId, { hn: item });
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
  const accountData = syncFetch(`${GithubAccount.GITHUB_API_URL_BASE}/users/${username}`);
  if (accountData === null) return null;
  switch (accountData.type) {
    case 'User':
      return new GithubUser(username);
    case 'Organization':
      return new GithubOrganization(username);
    default:
      throw new Error(`Unexpected github account type: ${accountData.type}`);
  }
}

export function materializeGithubRepository(owner: string, title: string): GithubRepository | null {
  return GithubRepository.make(owner, title);
}
