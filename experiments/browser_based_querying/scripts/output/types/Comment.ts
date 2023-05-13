import * as t from '../index'
export type Comment = { id: number, unixTime: number, url: string, textHtml: string, textPlain: string, byUsername: string, byUser: t.User, reply: t.Comment | null, link: t.Webpage | null, parent: t.Item } & ( t.Item | t.Webpage )