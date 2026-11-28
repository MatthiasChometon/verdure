// Runs before each Lighthouse audit of the signed-in pass (lhci `puppeteerScript`): checks that the
// API accepts the seeded account's token, then stores it as the session cookie of localhost (the
// cookie is not port-bound, so the front on 3777 and the API on LH_API_PORT both see it, like in the app).
// An `extraHeaders` cookie is not enough: the pages rendered the signed-out view.
const token = process.env.LH_SESSION_TOKEN;
// The API port of the run (3000 by default, like the CI job); set LH_API_PORT when it listens elsewhere.
const apiPort = process.env.LH_API_PORT ?? '3000';

const assertAccepted = async () => {
  const response = await fetch(`http://localhost:${apiPort}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `auth_token=${token}` },
    body: JSON.stringify({ query: '{ me { id } }' }),
  });
  const { data } = await response.json();
  if (!data?.me?.id) {
    throw new Error(`The API refused the session token: ${JSON.stringify(data)}`);
  }
};

module.exports = async (browser) => {
  await assertAccepted();
  const page = await browser.newPage();
  await page.setCookie({
    name: 'auth_token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });
  await page.close();
};
