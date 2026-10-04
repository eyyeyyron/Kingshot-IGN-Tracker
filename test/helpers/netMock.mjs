// ESM preload (node --import) that intercepts all outbound HTTP for workflow tests.
// Config is passed via the MOCK_CONFIG env var as JSON:
//   { "players": { "<fid>": <mightpulsePayload> | { "status": <code>, "body": <json> } },
//     "webhook": false }  // set webhook:false to also block Discord POSTs
import { MockAgent, setGlobalDispatcher } from 'undici';

const config = JSON.parse(process.env.MOCK_CONFIG ?? '{}');
const players = config.players ?? {};

const agent = new MockAgent();
agent.disableNetConnect();
setGlobalDispatcher(agent);

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  data: JSON.stringify(payload),
  responseOptions: { headers: { 'content-type': 'application/json' } }
});

const mightpulse = agent.get('https://api.mightpulse.com');
mightpulse
  .intercept({ path: (p) => p.startsWith('/v1/players/'), method: 'GET' })
  .reply((opts) => {
    const match = opts.path.match(/\/v1\/players\/([^/?]+)/);
    const fid = match ? decodeURIComponent(match[1]) : '';
    const entry = players[fid];

    if (!entry) {
      return jsonResponse(404, { ok: false });
    }

    if (typeof entry.status === 'number') {
      return jsonResponse(entry.status, entry.body ?? { ok: false });
    }

    return jsonResponse(200, entry);
  })
  .persist();

if (config.webhook !== false) {
  const discord = agent.get('https://discord.com');
  discord
    .intercept({ path: (p) => p.startsWith('/api/webhooks/'), method: 'POST' })
    .reply(204, '')
    .persist();
}
