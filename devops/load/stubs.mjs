// What the API calls outside itself, stood in for at a fixed latency so the replica measures
// the API and nothing else (plan: "the AI worker stubbed at a fixed latency"):
//
//   - the AI api (embed, identify) and GBIF (species suggestions) on HTTP :8001, each
//     answering after STUB_LATENCY_MS;
//   - a mail sink on SMTP :2525 that keeps the tokens of the links it receives, served on
//     GET :8001/mail/token?to=<email>, so the load script can verify an address or reset a
//     password like a person following the e-mail would.
//
// No dependency. Usage: `node stubs.mjs`.
import { createServer as createHttp } from 'node:http';
import { createServer as createSmtp } from 'node:net';

const LATENCY_MS = Number(process.env.STUB_LATENCY_MS ?? 50);
const tokens = new Map();

const answer = (response, body) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

const decodeQuotedPrintable = (text) =>
  text
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );

createHttp((request, response) => {
  const url = new URL(request.url ?? '/', 'http://stub');
  if (url.pathname === '/mail/token') {
    const token = tokens.get(url.searchParams.get('to') ?? '');
    response.writeHead(token === undefined ? 404 : 200);
    response.end(token ?? '');
    return;
  }
  if (url.pathname === '/sleep') {
    setTimeout(
      () => answer(response, {}),
      Number(url.searchParams.get('ms') ?? 100),
    );
    return;
  }
  request.resume();
  request.on('end', () =>
    setTimeout(() => {
      if (url.pathname === '/identify')
        return answer(response, { species: 'Monstera deliciosa' });
      if (url.pathname === '/embed')
        return answer(response, { embedding: [0.1, 0.2, 0.3, 0.4] });
      if (url.pathname.endsWith('/species/suggest'))
        return answer(response, [
          {
            key: 1,
            canonicalName: 'Monstera deliciosa',
            scientificName: 'Monstera deliciosa Liebm.',
            kingdom: 'Plantae',
          },
        ]);
      answer(response, { results: [], endOfRecords: true });
    }, LATENCY_MS),
  );
}).listen(8001, '127.0.0.1');

createSmtp((socket) => {
  let recipient = '';
  let data;
  socket.write('220 sink ESMTP\r\n');
  socket.on('data', (chunk) => {
    const text = chunk.toString('latin1');
    if (data !== undefined) {
      data += text;
      if (data.endsWith('\r\n.\r\n')) {
        const token = /token=([a-f0-9]+)/.exec(decodeQuotedPrintable(data));
        if (token?.[1] !== undefined) tokens.set(recipient, token[1]);
        data = undefined;
        socket.write('250 queued\r\n');
      }
      return;
    }
    for (const line of text.split('\r\n').filter((l) => l !== '')) {
      const command = line.toUpperCase();
      if (command.startsWith('RCPT TO:')) {
        recipient = /<([^>]*)>/.exec(line)?.[1] ?? '';
        socket.write('250 ok\r\n');
      } else if (command === 'DATA') {
        data = '';
        socket.write('354 go\r\n');
      } else if (command === 'QUIT') {
        socket.end('221 bye\r\n');
      } else {
        socket.write('250 ok\r\n');
      }
    }
  });
  socket.on('error', () => undefined);
}).listen(2525, '127.0.0.1');
