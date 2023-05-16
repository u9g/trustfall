import { materializeWebsite } from '../utils';
import { Item } from './Item';
import { Webpage } from './Webpage';

export class Job extends Item<{
  id: number;
  time: number;
  type: string;
  title: string;
  score: number;
  url: string;
}> {
  //   # own properties
  //   """
  //   The job posting's title: the one-liner seen on the front page, for example.
  //   """
  //   title: String!
  title(): string {
    if ('hn' in this.data) {
      return this.data.hn.title;
    }
    return this.data.algolia.title;
  }
  //   """
  //   The total number of points this submission has received.
  //   """
  //   score: Int!
  //   """
  score(): number {
    if ('hn' in this.data) {
      return this.data.hn.score;
    }
    return this.data.algolia.points;
  }
  //   The URL this job posting points to.
  //   """
  //   submittedUrl: String!
  submittedUrl(): string {
    if ('hn' in this.data) {
      return this.data.hn.url;
    }
    return this.data.algolia.url!;
  }
  //   # edges
  //   """
  //   The web page this job posting links to.
  //   """
  //   link: Webpage!
  *link(): IterableIterator<Webpage> {
    const url = this.submittedUrl();
    yield materializeWebsite(url)!;
  }
}
