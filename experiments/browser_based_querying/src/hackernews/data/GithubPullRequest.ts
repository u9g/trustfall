import { materializeGithubAccount } from '../utils';
import { GithubAccount } from './GithubAccount';
import { Webpage } from './Webpage';
import { syncFetch } from '../syncfetcher';

export class GithubPullRequest extends Webpage {
  data: {
    title: string;
    body: string;
    user: { login: string };
  };
  private constructor(url: string, data: any) {
    super(url);
    this.data = data;
  }

  static make(owner: string, repo: string, number: string): GithubPullRequest | null {
    const prData = syncFetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`);
    if (prData === null) return null;

    return new GithubPullRequest(`https://github.com/${owner}/${repo}/pull/${number}`, prData);
  }

  //   """
  //   The title of the pull request.
  //   """
  //   title: String!
  title(): string {
    return this.data.title;
  }

  //   """
  //   The body of the pull request.
  //   """
  //   body: String
  body(): string | null {
    return this.data.body;
  }

  //   """
  //   The creator of the pull request.
  //   """
  //   creator: GithubAccount
  *creator(): IterableIterator<GithubAccount> {
    const account = materializeGithubAccount(this.data.user.login);
    if (account !== null) yield account;
  }

  __typename = () => 'GithubPullRequest';
}
