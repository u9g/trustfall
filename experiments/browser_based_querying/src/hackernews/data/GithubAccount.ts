import { Webpage } from './Webpage';

export abstract class GithubAccount extends Webpage {
  data: {
    login: string;
  };
  constructor(username: string, data: any) {
    super(`https://github.com/${username}`);
    this.data = data;
  }

  //   """
  //   The username of the GitHub account
  //   """
  //   username: String!
  username(): string {
    return this.data.login;
  }

  __typename = () => 'GithubAccount';
}
