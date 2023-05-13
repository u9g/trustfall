import * as t from '../index'
export type Webpage = { url: string } & ( t.Item | t.Job | t.Story | t.Comment | t.User | t.GithubUser | t.GithubOrganization | t.GithubAccount | t.GithubPullRequest )