import * as t from '../index'
export type User = { id: string, karma: number, aboutHtml: string | null, aboutPlain: string | null, unixCreatedAt: number, url: string, submitted: t.Item | null, link: t.Webpage | null } & ( t.Webpage )