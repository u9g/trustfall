import * as t from '../index'
export type Job = { id: number, unixTime: number, url: string, title: string, score: number, submittedUrl: string, link: t.Webpage } & ( t.Item | t.Webpage )