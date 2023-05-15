import { materializeGithubRepository } from '../utils';
import { GithubAccount } from './GithubAccount';
import { GithubRepository } from './GithubRepository';
import { syncFetch } from './datautils';

export class GithubOrganization extends GithubAccount {
  constructor(username: string) {
    super(username);
  }

  *repos(): IterableIterator<GithubRepository> {
    let page = 1;
    while (true) {
      // https://api.github.com/orgs/PrismarineJS/repos
      const repos = syncFetch(
        GithubAccount.GITHUB_API_URL_BASE + `/orgs/${this.userName}/repos?page=${page++}`
      );
      if (repos.length === 0) return;

      for (const { name } of repos) {
        const repo = materializeGithubRepository(this.userName, name);
        if (repo !== null) yield repo;
      }
    }
  }
  __typename = () => 'GithubOrganization';
}
