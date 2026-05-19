/**
 * Ad traffic-source capture — privacy-respecting (no PII, no cookies).
 *
 * Records the visitor's ORIGINAL traffic source once per browser session in
 * sessionStorage. The ad iframes read it at click time so each banner click
 * can be attributed to where the visitor came from (Google, Claude, direct,
 * ...) — both in our own analytics and, via utm_term, on the destination site.
 */
(function () {
  if (sessionStorage.getItem('mpc_traffic_source')) return;

  function identify() {
    var ref = (document.referrer || '').toLowerCase();
    if (!ref) return 'direct';

    var host;
    try { host = new URL(document.referrer).hostname.replace(/^www\./, ''); }
    catch (e) { return 'unknown'; }

    // Arriving from elsewhere on our own site is not an external source.
    if (host.indexOf('mypasswordchecker.com') !== -1) return 'internal';

    // Ordered most-specific first so e.g. gemini.google.com beats google.
    var map = [
      ['claude.ai', 'claude_ai'],
      ['chatgpt.com', 'chatgpt'], ['chat.openai.com', 'chatgpt'], ['openai.com', 'chatgpt'],
      ['gemini.google.com', 'gemini'],
      ['copilot.microsoft.com', 'copilot'], ['bing.com/chat', 'copilot'],
      ['perplexity.ai', 'perplexity'], ['you.com', 'you_ai'],
      ['grok.com', 'grok'], ['poe.com', 'poe'], ['character.ai', 'character_ai'],
      ['bing.com', 'bing'], ['duckduckgo.com', 'duckduckgo'], ['yahoo.com', 'yahoo'],
      ['baidu.com', 'baidu'], ['yandex.', 'yandex'], ['google.', 'google'],
      ['linkedin.com', 'linkedin'], ['reddit.com', 'reddit'], ['facebook.com', 'facebook'],
      ['news.ycombinator.com', 'hackernews'],
      ['t.co', 'twitter'], ['twitter.com', 'twitter'], ['x.com', 'twitter'],
      ['github.com', 'github'], ['stackoverflow.com', 'stackoverflow'],
      ['flowguideai.com', 'flowguideai_site'], ['forgemcp.ai', 'forgemcp_site']
    ];
    for (var i = 0; i < map.length; i++) {
      if (ref.indexOf(map[i][0]) !== -1) return map[i][1];
    }
    return 'other_' + host;
  }

  try {
    sessionStorage.setItem('mpc_traffic_source', identify());
    sessionStorage.setItem('mpc_traffic_source_time', new Date().toISOString());
  } catch (e) {}
})();
