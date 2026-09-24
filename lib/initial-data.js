// 学習データの初期状態と読み込み時の整形
// 以前のバージョンでは初回に【サンプル】データを入れていたが、分かりにくいため廃止した。
// 保存済みのデータに残っているサンプル（isSample: true）は、読み込むときに取り除く。
const INITIAL_DATA = { items: [], history: [] };

function emptyData() {
  return structuredClone(INITIAL_DATA);
}

function withoutSamples(data) {
  if (!data || typeof data !== 'object') return emptyData();
  return {
    ...data,
    items: (Array.isArray(data.items) ? data.items : []).filter(i => !i.isSample),
    history: (Array.isArray(data.history) ? data.history : []).filter(h => !h.isSample)
  };
}

module.exports = { emptyData, withoutSamples };
