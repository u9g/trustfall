import { materializeItem, materializeWebsite } from '../utils';
import { Comment } from './Comment';
import { Item } from './Item';
import { User } from './User';
import { Webpage } from './Webpage';
import { extractPlainTextFromHnMarkup, linksInHnMarkup } from './datautils';

export class Story extends Item {
  data: {
    id: number;
    time: number;
    type: string;
    by: string;
    score: number;
    text?: string;
    title: string;
    url?: string;
    kids?: number[];
  };
  constructor(itemId: number, data: any) {
    super(itemId, data);
    this.data = data;
  }
  //   # own properties
  //   """
  //   The display name of the user that submitted this story.
  //   """
  //   byUsername: String!
  byUsername(): string {
    return this.data.by;
  }
  //   """
  //   The current score of this story submission.
  //   """
  //   score: Int!
  score(): number {
    return this.data.score;
  }
  //   """
  //   For text submissions, contains the submitted text as HTML.
  //   For link submissions, this field is null.
  //   """
  //   textHtml: String
  textHtml(): string | null {
    return this.data.text ?? null;
  }
  //   """
  //   For text submissions, contains the submitted text as plain text,
  //   stripped of any HTML tags. For link submissions, this field is null.
  //   """
  //   textPlain: String
  textPlain(): string | null {
    return extractPlainTextFromHnMarkup(this.textHtml());
  }
  //   """
  //   The story's title: the one-liner seen on the front page, for example.
  //   """
  //   title: String!
  title(): string {
    return this.data.title;
  }
  //   """
  //   For link submissions, contains the submitted link.
  //   For text submissions, this field is null.
  //   """
  //   submittedUrl: String
  submittedUrl(): string | null {
    return this.data.url ?? null;
  }
  //   # edges
  //   """
  //   The profile of the user that submitted this story.
  //   """
  //   byUser: User!
  *byUser(): IterableIterator<User> {
    yield User.make(this.byUsername())!;
  }
  //   """
  //   The top-level comments on this story.
  //   """
  //   comment: [Comment!]
  *comment(): IterableIterator<Comment> {
    for (const comment of this.data.kids ?? []) {
      const item = materializeItem(comment);
      if (item != null) {
        yield item as Comment;
      }
    }
  }
  //   """
  //   The web pages this story links to, if any.
  //   For link submissions, this is the submitted link.
  //   For text submissions, this includes all links in the text.
  //   """
  //   link: [Webpage!]
  *link(): IterableIterator<Webpage> {
    const url = this.submittedUrl();
    if (url != null) {
      // link submission
      yield materializeWebsite(url)!;
    } else {
      // text submission
      yield* linksInHnMarkup(this.textHtml());
    }
  }
  __typename = () => 'Story';
}
