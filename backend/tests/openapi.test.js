const assert = require('node:assert/strict');
const { test } = require('node:test');
const app = require('../src/app');

test('serve Swagger UI and the OpenAPI document without a session', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const [uiResponse, specResponse] = await Promise.all([
    fetch(`${baseUrl}/api/docs`),
    fetch(`${baseUrl}/api/docs/openapi.json`),
  ]);
  assert.equal(uiResponse.status, 200);
  assert.match(await uiResponse.text(), /Swagger UI/);
  assert.equal(specResponse.status, 200);

  const spec = await specResponse.json();
  assert.equal(spec.openapi, '3.0.3');
  assert.ok(spec.paths['/reservas/{id}'].delete);
  assert.equal(spec.components.securitySchemes.SessionCookie.name, 'nexo_session');

  function assertReferencesResolve(value, path = '#') {
    if (!value || typeof value !== 'object') {
      return;
    }
    if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
      const target = value.$ref.slice(2).split('/').reduce((current, key) => current?.[key], spec);
      assert.notEqual(target, undefined, `Unresolved reference at ${path}: ${value.$ref}`);
    }
    for (const [key, nestedValue] of Object.entries(value)) {
      assertReferencesResolve(nestedValue, `${path}/${key}`);
    }
  }

  assertReferencesResolve(spec);
});
