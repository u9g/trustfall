import { materializeGithubAccount } from '../utils';
import { GithubAccount } from './GithubAccount';
import { Webpage } from './Webpage';
import { syncFetch } from '../syncfetcher';

export class GithubRepository extends Webpage {
  data: {
    name: string;
    owner: { login: string };
  };

  private constructor(url: string, data: any) {
    super(url);
    this.data = data;
  }

  static make(owner: string, title: string): GithubRepository | null {
    // https://api.github.com/repos/PrismarineJS/mineflayer
    const repoData = syncFetch(`https://api.github.com/repos/${owner}/${title}`);
    if (repoData.message === 'Not Found') return null;

    return new GithubRepository(`https://github.com/${owner}/${title}`, repoData);
  }
  //   """
  //   The title of the repository.
  //   """
  //   title: String!
  title(): string {
    return this.data.name;
  }
  //   """
  //   The owner of the repository.
  //   """
  //   owner: GithubAccount
  *owner(): IterableIterator<GithubAccount> {
    const account = materializeGithubAccount(this.data.owner.login);
    if (account !== null) yield account;
  }

  __typename = () => 'GithubRepository';
}
