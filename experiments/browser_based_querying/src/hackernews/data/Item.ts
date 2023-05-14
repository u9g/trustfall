import { Webpage } from './Webpage';

export class Item extends Webpage {
  data: { id: number; time: number; type: string };

  constructor(itemId: number, data: any) {
    super(`https://news.ycombinator.com/item?id=${itemId}`);
    this.data = data;
  }

  id(): number {
    return this.data.id;
  }

  unixTime(): number {
    return this.data.time;
  }

  type(): string {
    return this.data.type;
  }

  __typename = () => 'Item';
}
