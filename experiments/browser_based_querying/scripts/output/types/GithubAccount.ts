import * as t from '../index'
export type GithubAccount = { username: string, url: string } & ( t.Webpage | t.GithubUser | t.GithubOrganization | t.Webpage )