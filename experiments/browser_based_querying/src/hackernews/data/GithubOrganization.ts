import { GithubAccount } from './GithubAccount';

export class GithubOrganization extends GithubAccount {
  constructor(username: string, data: any) {
    super(username, data);
    this.data = data;
  }
  __typename = () => 'GithubOrganization';
}
