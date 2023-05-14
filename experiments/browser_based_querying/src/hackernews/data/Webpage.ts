export class Webpage {
  #url: string;
  constructor(url: string) {
    this.#url = url;
  }

  url() {
    return this.#url;
  }

  __typename = () => 'Webpage';
}
