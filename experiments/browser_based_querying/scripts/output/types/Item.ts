import * as t from '../index'
export type Item = { id: number, unixTime: number, url: string } & ( t.Webpage | t.Job | t.Story | t.Comment | t.Webpage )