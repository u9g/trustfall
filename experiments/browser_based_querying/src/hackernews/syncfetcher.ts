import { SyncContext } from '../sync';

declare const fetchPort: MessagePort;

let fetchCtr = 1;

export function syncFetch(url: string): any | null {
  const sync = SyncContext.makeDefault();

  const fetchOptions: Partial<RequestInit> = {
    method: 'GET',
  };

  if (url.startsWith('https://api.github.com')) {
    fetchOptions.headers ??= {};
    const headers = fetchOptions.headers as any;
    headers.Authorization = `Bearer `;
    headers['X-GitHub-Api-Version'] = '2022-11-28';
    headers.Accept = 'application/vnd.github+json';
  }

  const message = {
    sync: sync.makeSendable(),
    input: url,
    init: fetchOptions,
  };
  fetchPort.postMessage(message);

  const i = fetchCtr++;
  const lbl = `fetch ${i}: ${url}`;

  console.time(lbl);

  const recv = sync.receive();
  const result = new TextDecoder().decode(recv);
  const data = JSON.parse(result);

  // console.timeLog(lbl, data);
  console.timeEnd(lbl);

  return data;
}
