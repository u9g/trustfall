import { materializeWebsite } from '../adapter';
import { Item } from './Item';
import { Webpage } from './Webpage';

export class Job extends Item {
  data: {
    id: number;
    time: number;
    type: string;
    title: string;
    score: number;
    url: string;
  };

  constructor(itemId: number, data: any) {
    super(itemId, data);
    this.data = data;
  }
  //   # own properties
  //   """
  //   The job posting's title: the one-liner seen on the front page, for example.
  //   """
  //   title: String!
  title(): string {
    return this.data.title;
  }
  //   """
  //   The total number of points this submission has received.
  //   """
  //   score: Int!
  //   """
  score(): number {
    return this.data.score;
  }
  //   The URL this job posting points to.
  //   """
  //   submittedUrl: String!
  submittedUrl(): string {
    return this.data.url;
  }
  //   # edges
  //   """
  //   The web page this job posting links to.
  //   """
  //   link: Webpage!
  *link(): IterableIterator<Webpage> {
    const url = this.submittedUrl();
    yield materializeWebsite(url);
  }
}
