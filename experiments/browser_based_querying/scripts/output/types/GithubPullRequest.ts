import * as t from '../index'
export type GithubPullRequest = { title: string, creator: t.GithubAccount, body: string | null, url: string } & ( t.Webpage )