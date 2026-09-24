// ローカル実行用ストレージ: data/store.json と data/config.json にアトミック保存する
const fs = require('node:fs');
const path = require('node:path');
const { emptyData, withoutSamples } = require('./initial-data');

function createFileStorage(dataDir) {
  const dataFile = path.join(dataDir, 'store.json');
  const configFile = path.join(dataDir, 'config.json');

  function ensureDir() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  function writeAtomic(file, content, mode) {
    ensureDir();
    const tmpFile = `${file}.tmp`;
    fs.writeFileSync(tmpFile, content, { encoding: 'utf8', mode });
    fs.renameSync(tmpFile, file);
  }

  function loadConfig() {
    try {
      if (!fs.existsSync(configFile)) return {};
      return JSON.parse(fs.readFileSync(configFile, 'utf8')) || {};
    } catch (err) {
      console.error('Failed to load config:', err.message);
      return {};
    }
  }

  return {
    kind: 'file',
    location: dataFile,

    async load() {
      try {
        if (!fs.existsSync(dataFile)) {
          writeAtomic(dataFile, JSON.stringify(emptyData(), null, 2));
          return emptyData();
        }
        return withoutSamples(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
      } catch (err) {
        console.error('Failed to load store, initializing fallback:', err.message);
        return emptyData();
      }
    },

    async save(_ctx, data) {
      writeAtomic(dataFile, JSON.stringify(data, null, 2));
    },

    // 画面から保存した Jev APIキー（権限 0600、.gitignore 済み）
    keyStore: {
      get() {
        return (loadConfig().jevApiKey || '').trim();
      },
      set(apiKey) {
        const config = loadConfig();
        if (apiKey) config.jevApiKey = apiKey;
        else delete config.jevApiKey;
        writeAtomic(configFile, JSON.stringify(config, null, 2), 0o600);
      }
    }
  };
}

module.exports = { createFileStorage };
