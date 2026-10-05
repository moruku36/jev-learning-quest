# Weekly reading list updates

## English

The Monday workflow runs at 00:17 UTC (09:17 JST). GitHub Actions serializes scheduled and manual runs. A JST Monday week is marked `complete` only after eight eligible readings are added and every configured primary source fetches and parses successfully. If the catalog changes with fewer additions or any primary-source failures, state is recorded as `partial`; either state makes later same-week runs no-ops before any network request. With zero additions, no update state is written. A valid empty feed is reported as a successful empty source; an unexpected response format, an HTML challenge, or feed entries that the parser cannot read are source failures.

RSS and Anthropic newsroom candidates need a real, non-future publication date and must be no more than one year old. Existing URLs and titles are deduplicated. Publication dates are retained; the updater does not substitute the run date when a source omits one. The Anthropic page must contain its known article-card structure. Each feed must have an RSS, Atom, or RDF root.

Primary-source importance remains the first ranking dimension. It prioritizes OpenAI, Anthropic, and Google, then records explicit source evidence such as deployment scale or observed operational/security impact with the evidence URL and assessment time. Community feedback is stored separately and only breaks ties between candidates with the same primary score when both have observed HN data. An unknown community measurement does not lower a candidate's rank.

For at most 12 primary-ranked candidate URLs in a run, the updater asks the public Algolia Hacker News search index for exact-URL story matches, then verifies the selected story URL against the official Hacker News Firebase API. It stores the HN story URL, observation time, story `score` as points, and `descendants` as comments. Points are HN score points, not people or readers. It does not combine reposts. URL matching preserves host, path, and meaningful query parameters; it removes fragments and a small allowlist of known tracking parameters. Similar paths and different meaningful query values do not match. A missing match, lookup cap, timeout, API error, or URL mismatch is stored as `unknown`, never as zero. Each candidate requires at most two requests, with a 2.5-second timeout per request; HN lookups do not require credentials and their failures do not count as primary-source failures.

Sources: [official Hacker News API](https://github.com/HackerNews/API) documents story `score`, `descendants`, and item lookup by ID. [Algolia HN Search](https://github.com/algolia/hn-search) documents the indexed HN story fields used to discover candidate IDs. Popularity, citations, GitHub stars, and user counts are not inferred.

Conference material must have a first-party abstract or paper, official URL, and conference dates. Event schedules alone are not readings. At most three conference-abstract items from the same evidence class are selected per run.

## 日本語

週次workflowは月曜00:17 UTC（日本時間09:17）に実行します。scheduleと手動実行は直列化されます。日本時間の月曜始まりの週は、適格な教材を8件追加し、すべての主要情報源の取得・解析に成功した場合だけ`complete`として記録します。追加数が8件未満、または主要情報源に失敗がありカタログが変わった場合は`partial`を記録します。どちらの状態も同じ週の次回実行をネットワーク取得前にno-opで終了させます。追加が0件なら更新状態を記録しません。形式が確認できた空feedは「正常な空」として記録し、想定外形式、HTML challenge、解析できないfeed entryは情報源失敗として扱います。

RSSとAnthropic公式ニュースの記事は、実在する未来でない公開日があり、1年以内のものに限ります。既存URL・タイトルは重複排除し、公開日がない場合に実行日で補いません。Anthropicページは既知の記事カード構造を検証し、feedはRSS・Atom・RDFのルートを検証します。

順位付けではまず一次資料の重要性を見ます。OpenAI・Anthropic・Googleを優先し、記事に明記された導入規模や確認済みの運用・セキュリティ影響を、根拠URLと評価日時とともに記録します。コミュニティ反響は別の根拠として保存し、一次資料スコアが同じ候補同士で、双方のHacker News観測値が得られた場合だけ同点判定に使います。反響を取得できない候補の順位を下げません。

1回あたり一次順位の上位12 URLまで、公開Algolia Hacker News検索から記事URLが完全一致するstory候補を探し、公式Hacker News Firebase APIでstory URLを再検証します。Hacker Newsのstory `score`（points）と`descendants`（comments）を取得日時、HN記事URLとともに記録します。pointsはHN上のスコアであり、人数や読者数ではありません。同じ外部記事の再投稿は合算しません。URL照合ではhost・path・意味のあるqueryを維持し、fragmentと既知のtracking queryだけを除去します。似たpathや異なる意味のあるquery値は一致扱いしません。記事が見つからない、上限超過、timeout、API失敗、URL不一致の場合は値を0にせず`unknown`と記録します。候補1件につき最大2リクエスト、各2.5秒timeoutです。HN取得失敗は主要情報源の失敗とは分けて扱います。

参照: [Hacker News公式API](https://github.com/HackerNews/API)はstoryの`score`・`descendants`とIDによる取得を定義しています。[Algolia HN Search](https://github.com/algolia/hn-search)はstory ID探索に使う検索インデックス項目を説明しています。人気度、引用数、GitHub stars、利用者数は推測しません。

カンファレンス教材は一次資料として読める要旨または論文、公式URL、開催日を確認できるものに限ります。開催案内・日程だけのページは教材にしません。同じ証拠区分のカンファレンス要旨は1回に最大3件です。

### 2026年カンファレンス参照

2026年の情報は[moruku36/security-landscape-2026](https://github.com/moruku36/security-landscape-2026)の会議調査を参照しています。候補はDEF CON 34のAI Village公開ポスター要旨から選び、年次脅威レポートの統計とは別の証拠区分で管理します。
