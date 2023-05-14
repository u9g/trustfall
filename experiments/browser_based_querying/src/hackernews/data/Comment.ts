import { materializeItem } from '../utils';
import { Item } from './Item';
import { User } from './User';
import { Webpage } from './Webpage';
import { extractPlainTextFromHnMarkup, linksInHnMarkup } from './datautils';

export class Comment extends Item {
  data: {
    id: number;
    time: number;
    type: string;
    by: string;
    text: string;
    parent?: number;
    kids?: number[];
  };
  constructor(itemId: number, data: any) {
    super(itemId, data);
    this.data = data;
  }

  //   # own properties
  //   """
  //   The name of the user that submitted this comment.
  //   """
  //   byUsername: String!
  byUsername(): string {
    return this.data.by;
  }
  //   """
  //   The text contained in the comment, represented as HTML.
  //   """
  //   textHtml: String!
  textHtml(): string {
    return this.data.text;
  }
  //   """
  //   The text contained in the comment, as plain text with HTML tags removed.
  //   """
  //   textPlain: String!
  textPlain(): string {
    return extractPlainTextFromHnMarkup(this.textHtml());
  }
  //   # edges
  //   """
  //   The profile of the user that submitted this comment.
  //   """
  //   byUser: User!
  *byUser(): IterableIterator<User> {
    yield User.make(this.byUsername())!;
  }
  //   """
  //   The replies to this comment, if any.
  //   """
  //   reply: [Comment!]
  *reply(): IterableIterator<Comment> {
    for (const comment of this.data.kids ?? []) {
      const item = materializeItem(comment);
      if (item != null) {
        yield item as Comment;
      }
    }
  }
  //   """
  //   Links contained within the comment, if any.
  //   """
  //   link: [Webpage!]
  *link(): IterableIterator<Webpage> {
    // text submission
    yield* linksInHnMarkup(this.textHtml());
  }
  //   """
  //   The parent item: for top-level comments, this is the story or job
  //   where the comment was submitted, and for replies it's the comment
  //   which is being replied to.
  //   """
  //   parent: Item! # either a parent comment or the story being commented on
  *parent(): IterableIterator<Item> {
    const parent = this.data.parent;
    if (parent == null) return;
    const item = materializeItem(parent);
    if (item === null) throw new Error("Comment doesn't have a parent");
    yield item;
  }

  __typename = () => 'Comment';
}
