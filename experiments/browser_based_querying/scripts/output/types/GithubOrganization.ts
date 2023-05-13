import * as t from '../index'
export type GithubOrganization = { username: string, url: string } & ( t.GithubAccount | t.Webpage )