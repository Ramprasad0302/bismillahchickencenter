import axios from 'axios';

// ============================================
// Short-lived GET cache + in-flight de-duplication
//
// Pages fetch their data on every visit, and several pages request the same
// endpoints (orders, retailers, settings...). This makes:
//   - identical GETs fired at the same moment share one network request;
//   - a GET repeated within TTL_MS (e.g. flicking between pages) answer
//     instantly from memory.
// Any POST/PUT/PATCH/DELETE clears the whole cache, so data you just changed
// is always re-fetched fresh — saving never shows stale numbers.
// Blob downloads (Excel/CSV exports) are never cached.
// ============================================
const TTL_MS = 15 * 1000;

const cache = new Map(); // key -> { at, response }
const inflight = new Map(); // key -> Promise<response>
let generation = 0; // bumped on every write so late GETs can't re-cache stale data

export const clearHttpCache = () => {
  generation += 1;
  cache.clear();
  inflight.clear();
};

const keyFor = (config) => {
  const auth = config.headers?.Authorization || config.headers?.authorization || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${config.baseURL || ''}|${config.url}|${params}|${String(auth).slice(-16)}`;
};

export const installHttpCache = (instance) => {
  const baseAdapter = axios.getAdapter(instance.defaults.adapter);

  instance.defaults.adapter = async (config) => {
    const method = (config.method || 'get').toLowerCase();

    if (method !== 'get') {
      clearHttpCache();
      return baseAdapter(config);
    }

    if (config.responseType && config.responseType !== 'json') {
      return baseAdapter(config);
    }

    const key = keyFor(config);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return { ...hit.response, config };
    }

    if (inflight.has(key)) {
      const response = await inflight.get(key);
      return { ...response, config };
    }

    const startedAt = generation;
    const request = baseAdapter(config)
      .then((response) => {
        if (startedAt === generation && response.status >= 200 && response.status < 300) {
          cache.set(key, { at: Date.now(), response });
        }
        return response;
      })
      .finally(() => {
        if (inflight.get(key) === request) inflight.delete(key);
      });

    inflight.set(key, request);
    return request;
  };

  return instance;
};
