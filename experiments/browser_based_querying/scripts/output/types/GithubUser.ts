import * as t from '../index'
export type GithubUser = { username: string, url: string } & ( t.GithubAccount | t.Webpage )