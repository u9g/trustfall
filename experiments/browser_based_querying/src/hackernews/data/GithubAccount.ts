import { GithubRepository } from './GithubRepository';
import { Webpage } from './Webpage';

export abstract class GithubAccount extends Webpage {
  userName: string;

  constructor(username: string) {
    super(`https://github.com/${username}`);
    this.userName = username;
  }

  //   """
  //   The username of the GitHub account
  //   """
  //   username: String!
  username(): string {
    return this.userName;
  }

  // """
  // The repositories this github account owns
  // """
  // repos: GithubRepository
  abstract repos(): IterableIterator<GithubRepository>;

  __typename = () => 'GithubAccount';

  static GITHUB_API_URL_BASE = 'https://api.github.com';
}
