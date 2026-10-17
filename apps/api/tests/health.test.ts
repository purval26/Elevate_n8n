import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';

test('Integration: GET /health', async (t) => {
  const app = await buildApp({ logger: false });

  t.after(async () => {
    await app.close();
  });

  await t.test('1. returns HTTP 200 with service identity and status ok', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] ?? '', /application\/json/i);

    const body = res.json() as { status: string; service: string };
    assert.deepEqual(body, {
      status: 'ok',
      service: 'elevate-content-engine-api',
    });
  });

  await t.test('2. handles query parameters cleanly without altering response', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health?probe=readiness&timestamp=12345',
    });

    assert.equal(res.statusCode, 200);
    const body = res.json() as { status: string; service: string };
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'elevate-content-engine-api');
  });

  await t.test('3. returns 404 for non-GET methods to /health', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/health',
      payload: {},
    });
    assert.equal(postRes.statusCode, 404);

    const putRes = await app.inject({
      method: 'PUT',
      url: '/health',
    });
    assert.equal(putRes.statusCode, 404);
  });
});
