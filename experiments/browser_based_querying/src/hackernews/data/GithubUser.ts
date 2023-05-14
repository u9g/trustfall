import { GithubAccount } from './GithubAccount';

export class GithubUser extends GithubAccount {
  constructor(username: string, data: any) {
    super(`https://github.com/${username}`, data);
    this.data = data;
  }

  __typename = () => 'GithubUser';
}
