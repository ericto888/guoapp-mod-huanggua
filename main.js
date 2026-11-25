const navUrl = "https://hgdju.com/homeward";
const legacyNavUrls = ["https://hgdja1.com/"];
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
const hostTtlMs = 30 * 60 * 1000;
const hostCacheKey = "huanggua.latestHost.v1";
const seedHosts = [
  "https://hgdj17.com",
  "https://hgdjb15.com",
  "https://hgdj1.app",
  "https://abc.ywwegfkd.cc",
  "https://qwer.ywwegfkd.cc",
  "https://xyz.ywwegfkd.cc",
  "https://mkqjue.eyrkjyudz.cc",
  "https://porncz.eyrkjyudz.cc",
  "https://rixgqa.eyrkjyudz.cc",
];
const allowedHostSuffixes = [
  "hgdju.com",
  "hgdja1.com",
  "hgdj1.app",
  "hgdj17.com",
  "hgdjb15.com",
  "ywwegfkd.cc",
  "eyrkjyudz.cc",
];
const categoriesList = [
  { id: "recommend", name: "推荐" },
  { id: "aiduanju", name: "AI 短剧" },
  { id: "manju", name: "AI 漫剧" },
  { id: "mogai", name: "AI 魔改" },
  { id: "zhenren", name: "真人短剧" },
  { id: "yuanchuang", name: "原创短剧" },
  { id: "browse", name: "全部" },
];
const categoryIds = {
  recommend: true,
  aiduanju: true,
  manju: true,
  mogai: true,
  zhenren: true,
  yuanchuang: true,
  browse: true,
};
const hostLinkPattern =
  /https?:\\?\/\\?\/(?:[a-zA-Z0-9-]+\\?\.)+[a-zA-Z]{2,}(?:\\?:[0-9]+)?(?:\\?\/[^\\s"'<>]*)?/gi;
const aliasPattern = /href="\/drama\/([a-zA-Z0-9\-]+)"/;
const imgTagPattern = /<img\b[^>]*>/gi;
const imgAttrPattern = /([a-zA-Z:_-]+)\s*=\s*"([^"]*)"/g;
const coverPathPattern = /(\/_img\/[A-Za-z0-9+/=]+\.(?:jpeg|jpg|png|webp))/;
const ogImagePattern =
  /<meta\b[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["']/i;
const ogImageAltPattern =
  /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i;
const altPattern = /<img[^>]+alt="([^"]+)"/;
const episodePattern = /(?:更新至|全)\s*(\d+)\s*集/;
const heatPattern = /([0-9.]+万?)\s*热度/;
const h1Pattern = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
const metaDescriptionPattern =
  /<meta\s+name="description"\s+content="([^"]*)"/i;
const playUrlPattern = /"source_url"\s*:\s*"([^"]+)"/;
const escapedM3u8Pattern = /https?:\\u002[Ff]\\u002[Ff][^"]+?\.m3u8[^"]*/;
const genericM3u8Pattern = /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/;
const payloadPattern =
  /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i;
const tagPattern = /<[^>]*>/g;

let cachedHost = "";
let cachedAt = 0;

function text(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function firstNonEmpty() {
  for (let index = 0; index < arguments.length; index++) {
    const value = text(arguments[index]);
    if (value !== "") {
      return value;
    }
  }
  return "";
}

function htmlUnescape(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, function (entity, code) {
      const number = parseInt(code, 16);
      return number > 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : entity;
    })
    .replace(/&#(\d+);/g, function (entity, code) {
      const number = parseInt(code, 10);
      return number > 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : entity;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return htmlUnescape(String(value === null || value === undefined ? "" : value).replace(tagPattern, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function base64Raw(value) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = [];
  for (let index = 0; index < value.length; index++) {
    let code = value.charCodeAt(index);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      const next = value.charCodeAt(++index);
      const point = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
      bytes.push(
        0xf0 | (point >> 18),
        0x80 | ((point >> 12) & 0x3f),
        0x80 | ((point >> 6) & 0x3f),
        0x80 | (point & 0x3f),
      );
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | (b >> 4)];
    if (index + 1 < bytes.length) {
      output += alphabet[((b & 15) << 2) | (c >> 6)];
    }
    if (index + 2 < bytes.length) {
      output += alphabet[c & 63];
    }
  }
  return output.replace(/=+$/, "");
}

function fetchResponse(address, referer, timeoutMs) {
  const response = host.fetchText({
    url: address,
    referer: referer,
    userAgent: userAgent,
    timeoutMs: timeoutMs || 20000,
  });
  return typeof response === "string" ? { body: response } : response || {};
}

function fetchText(address, referer, timeoutMs) {
  const response = fetchResponse(address, referer, timeoutMs);
  const status = Number(response.status || 0);
  if (status >= 400) {
    throw new Error("HTTP " + status + "：" + address);
  }
  return text(response.body);
}

function cacheReadHost() {
  try {
    const value = text(host.cacheGet(hostCacheKey));
    if (value === "") return "";
    const parsed = JSON.parse(value);
    return typeof parsed.host === "string" ? parsed.host.replace(/\/+$/, "") : "";
  } catch (error) {
    return "";
  }
}

function cacheWriteHost(value) {
  try {
    host.cacheSet(
      hostCacheKey,
      JSON.stringify({ host: value, updatedAt: Date.now() }),
      hostTtlMs
    );
  } catch (error) {}
}

function allowedCandidate(value) {
  const candidate = text(value).replace(/\/+$/, "");
  const match = /^https:\/\/([^/:?#]+)(?::[0-9]+)?$/i.exec(candidate);
  if (!match) return false;
  const hostname = match[1].toLowerCase();
  return allowedHostSuffixes.some(function (suffix) {
    return hostname === suffix || hostname.endsWith("." + suffix);
  });
}

function extractCandidateUrls(body) {
  const source = htmlUnescape(String(body || "")).replace(/\\\//g, "/");
  return source.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s"'<>]*)?/gi) || [];
}

function addCandidate(list, seen, value) {
  let candidate = text(value).replace(/[),.;]$/, "");
  const match = /^https?:\/\/[^/]+/i.exec(candidate);
  if (!match) return;
  candidate = match[0].replace(/\/+$/, "").replace(/^http:/i, "https:");
  if (!allowedCandidate(candidate) || seen[candidate]) return;
  seen[candidate] = true;
  list.push(candidate);
}

function validateHost(candidate) {
  try {
    const body = fetchText(candidate + "/aiduanju", candidate + "/", 12000);
    return body.includes("黄瓜短剧") && body.includes("/drama/");
  } catch (error) {
    return false;
  }
}

function getHost(forceRefresh) {
  if (!forceRefresh && cachedHost !== "" && Date.now() - cachedAt < hostTtlMs) {
    return cachedHost;
  }
  if (!forceRefresh) {
    const persisted = cacheReadHost();
    if (persisted !== "") {
      cachedHost = persisted;
      cachedAt = Date.now();
      return persisted;
    }
  }

  const candidates = [];
  const seen = {};
  for (const address of [navUrl].concat(legacyNavUrls)) {
    try {
      const response = fetchResponse(address, address, 15000);
      const headers = response.headers || {};
      addCandidate(candidates, seen, response.url || response.finalUrl || "");
      addCandidate(candidates, seen, headers.location || headers.Location || "");
      for (const match of extractCandidateUrls(response.body)) {
        addCandidate(candidates, seen, match);
      }
    } catch (error) {}
  }
  for (const seed of seedHosts) addCandidate(candidates, seen, seed);
  if (cachedHost !== "") addCandidate(candidates, seen, cachedHost);
  const persisted = cacheReadHost();
  if (persisted !== "") addCandidate(candidates, seen, persisted);

  for (const candidate of candidates) {
    if (validateHost(candidate)) {
      cachedHost = candidate;
      cachedAt = Date.now();
      cacheWriteHost(candidate);
      return candidate;
    }
  }
  throw new Error(
    "黄瓜短剧未发现可用线路。请先开启 VPN 刷新最新地址，再关闭 VPN 重试"
  );
}

function fetchPageWithRefresh(address, referer, validator) {
  let body = "";
  try {
    body = fetchText(address, referer);
    if (!validator || validator(body)) return body;
  } catch (error) {}

  const refreshedHost = getHost(true);
  const pathMatch = /^https?:\/\/[^/]+(\/[^?#]*)?(?:[?#].*)?$/i.exec(address);
  const path = pathMatch && pathMatch[1] ? pathMatch[1] : "/";
  body = fetchText(refreshedHost + path, refreshedHost + "/");
  if (validator && !validator(body)) {
    throw new Error("黄瓜短剧最新地址已刷新，但页面结构仍不可用");
  }
  return body;
}

function payloadValue(values, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }
  const index = Math.trunc(value);
  if (index < 0 || index >= values.length) {
    return undefined;
  }
  return values[index];
}

function payloadString(values, value) {
  const resolved = payloadValue(values, value);
  if (typeof resolved === "string") {
    return resolved.trim();
  }
  if (typeof resolved === "number" && Number.isFinite(resolved)) {
    return String(resolved);
  }
  return "";
}

function payloadInt(values, value) {
  const number = parseInt(payloadString(values, value), 10);
  return number > 0 && number <= 99999 ? number : 0;
}

function payloadCover(values, value) {
  const resolved = payloadValue(values, value);
  if (resolved && typeof resolved === "object" && !Array.isArray(resolved)) {
    return {
      url: payloadString(values, resolved.url),
      fallback: payloadString(values, resolved.fallback_url),
    };
  }
  return { url: payloadString(values, value), fallback: "" };
}

function parsePayload(body) {
  const match = payloadPattern.exec(body);
  if (match === null || match.length !== 2) {
    return {};
  }
  let values;
  try {
    values = JSON.parse(host.preserveIntegers(match[1]));
  } catch (error) {
    return {};
  }
  if (!Array.isArray(values)) {
    return {};
  }
  const items = {};
  for (const row of values) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(row, "cover")) {
      continue;
    }
    const slug = payloadString(values, row.slug);
    const cover = payloadCover(values, row.cover);
    if (slug === "" || (cover.url === "" && cover.fallback === "")) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(items, slug)) {
      continue;
    }
    items[slug] = {
      cover: cover.url,
      fallback: cover.fallback,
      title: payloadString(values, row.title),
      episodes: payloadInt(values, row.total_episode_count),
      heat: payloadString(values, row.heat_7d),
    };
  }
  return items;
}

function coverProxy(siteHost, raw) {
  const address = text(raw);
  if (address === "") {
    return "";
  }
  if (address.startsWith("/_img/")) {
    return siteHost + address;
  }
  if (!/^https?:\/\//i.test(address) || /[\s]/.test(address)) {
    return "";
  }
  let extension = "";
  const dot = address.lastIndexOf(".");
  if (dot > 0) {
    const tail = address.slice(dot);
    if (tail.length <= 6 && !/[\/?]/.test(tail)) {
      extension = tail;
    }
  }
  if (extension === "") {
    extension = ".jpeg";
  }
  return siteHost + "/_img/" + base64Raw(address) + extension;
}

function coverAddress(siteHost, raw, fallback) {
  const proxy = coverProxy(siteHost, raw);
  if (proxy !== "") {
    return proxy;
  }
  const value = text(fallback);
  if (value.startsWith("/") && !value.startsWith("//")) {
    return siteHost + value;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return "";
}

function metaImage(body, siteHost) {
  for (const pattern of [ogImagePattern, ogImageAltPattern]) {
    const match = pattern.exec(body);
    if (match === null || match.length !== 2) {
      continue;
    }
    const value = text(match[1]);
    if (value === "" || value.includes("social-default")) {
      continue;
    }
    if (value.startsWith("//")) {
      return "https:" + value;
    }
    if (value.startsWith("/")) {
      return siteHost + value;
    }
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
  }
  return "";
}

function cardImage(body) {
  let cover = "";
  let title = "";
  const tags = body.match(imgTagPattern) || [];
  for (const tag of tags.slice(0, 16)) {
    const attributes = {};
    let match;
    imgAttrPattern.lastIndex = 0;
    while ((match = imgAttrPattern.exec(tag)) !== null) {
      attributes[match[1].toLowerCase()] = text(match[2]);
    }
    let path = "";
    for (const key of [
      "data-src",
      "data-original",
      "data-lazy-src",
      "src",
      "srcset",
    ]) {
      const value = attributes[key] || "";
      const coverMatch = coverPathPattern.exec(value);
      if (coverMatch !== null) {
        path = coverMatch[1];
        break;
      }
    }
    if (path === "") {
      continue;
    }
    if (cover === "") {
      cover = path;
      title = attributes.alt || "";
    }
    if (title !== "") {
      break;
    }
  }
  return { cover: cover, title: title };
}

function dramaFromCard(segment, siteHost, payload) {
  const aliasMatch = aliasPattern.exec(segment);
  const alias = aliasMatch === null ? "" : text(aliasMatch[1]);
  if (alias === "") {
    return null;
  }
  const image = cardImage(segment);
  let title = text(image.title);
  if (title === "") {
    const altMatch = altPattern.exec(segment);
    if (altMatch !== null) {
      title = stripTags(altMatch[1]);
    }
  }
  const entry = payload[alias] || null;
  if (title === "" && entry !== null) {
    title = entry.title;
  }
  if (title === "") {
    return null;
  }
  let cover = "";
  if (image.cover !== "") {
    cover = siteHost + image.cover;
  } else if (entry !== null) {
    cover = coverAddress(siteHost, entry.cover, entry.fallback);
  }
  let episodes = 0;
  const episodeMatch = episodePattern.exec(segment);
  if (episodeMatch !== null) {
    episodes = parseInt(episodeMatch[1], 10) || 0;
  }
  if (episodes === 0 && entry !== null) {
    episodes = entry.episodes;
  }
  let heat = "";
  const heatMatch = heatPattern.exec(segment);
  if (heatMatch !== null) {
    heat = heatMatch[1] + "热度";
  }
  if (heat === "" && entry !== null && entry.heat !== "") {
    heat = entry.heat + "热度";
  }
  const drama = {
    id: host.dramaId(alias),
    source: host.source,
    sourceId: alias,
    title: title,
    name: title,
    channelName: "短剧",
    totalEpisode: String(episodes),
    episodeCount: String(episodes),
  };
  if (cover !== "") {
    drama.cover = cover;
    drama.coverUrl = cover;
  }
  if (heat !== "") {
    drama.views = heat;
  }
  return drama;
}

function parseCards(body, siteHost) {
  const segments = body.split('<article data-xpch="card-drama"');
  if (segments.length < 2) {
    return [];
  }
  const payload = parsePayload(body);
  const items = [];
  const seen = {};
  for (const segment of segments.slice(1)) {
    const drama = dramaFromCard(segment, siteHost, payload);
    if (drama === null || seen[drama.sourceId]) {
      continue;
    }
    seen[drama.sourceId] = true;
    items.push(drama);
  }
  return items;
}

function chaptersFor(body, siteHost, alias) {
  const pattern = new RegExp("/play/" + escapeRegex(alias) + "/(\\d+)", "g");
  const numbers = {};
  let match;
  while ((match = pattern.exec(body)) !== null) {
    const number = parseInt(match[1], 10);
    if (number > 0 && number <= 9999) {
      numbers[number] = true;
    }
  }
  const ordered = Object.keys(numbers)
    .map(function (value) {
      return parseInt(value, 10);
    })
    .sort(function (a, b) {
      return a - b;
    });
  if (ordered.length === 0) {
    ordered.push(1);
  }
  return ordered.map(function (number) {
    return {
      id: host.chapterId(alias, "ep-" + number),
      source: host.source,
      title: "第" + number + "集",
      pageUrl:
        siteHost + "/play/" + encodeURIComponent(alias) + "/" + number,
      currentEpisode: number,
    };
  });
}

function categories() {
  return categoriesList.map(function (entry) {
    return { id: entry.id, name: entry.name };
  });
}

function validCategory(category) {
  return categoryIds[text(category)] === true;
}

function catalogPage(page, category) {
  const currentPage = Math.max(1, Math.floor(Number(page) || 1));
  if (currentPage > 1) {
    return { items: [], hasMore: false };
  }
  const value = text(category);
  if (!validCategory(value)) {
    throw new Error("黄瓜短剧分类无效");
  }
  const siteHost = getHost();
  const path = value === "recommend" ? "/" : "/" + value;
  const body = fetchPageWithRefresh(siteHost + path, siteHost + "/", function (value) {
    return value.includes("黄瓜短剧") && value.includes("<article data-xpch");
  });
  const items = parseCards(body, siteHost);
  if (items.length === 0) {
    throw new Error("黄瓜短剧没有返回剧集，请稍后重试");
  }
  return { items: items, hasMore: false };
}

function home() {
  let items = [];
  try {
    items = catalogPage(1, "recommend").items.slice(0, 5);
  } catch (error) {
    // Keep the category navigation available if the landing-page catalog is temporarily unavailable.
  }
  return { categories: categories(), items: items };
}

function search(page, query) {
  return { items: [], hasMore: false };
}

function detail(sourceId) {
  const alias = text(sourceId);
  if (alias === "" || /[\/?#]/.test(alias)) {
    throw new Error("黄瓜短剧剧集 ID 无效");
  }
  const siteHost = getHost();
  const pageUrl = siteHost + "/drama/" + alias;
  const body = fetchPageWithRefresh(pageUrl, siteHost + "/", function (value) {
    return /<h1\b/i.test(value);
  });
  let title = "";
  const titleMatch = h1Pattern.exec(body);
  if (titleMatch !== null) {
    title = stripTags(titleMatch[1]);
  }
  if (title === "") {
    throw new Error("黄瓜短剧未返回剧集信息");
  }
  let desc = "";
  const descMatch = metaDescriptionPattern.exec(body);
  if (descMatch !== null) {
    desc = text(descMatch[1]);
  }
  let cover = "";
  const entry = parsePayload(body)[alias];
  if (entry) {
    cover = coverAddress(siteHost, entry.cover, entry.fallback);
  }
  if (cover === "") {
    const image = cardImage(body);
    if (image.cover !== "") {
      cover = siteHost + image.cover;
    }
  }
  if (cover === "") {
    cover = metaImage(body, siteHost);
  }
  const chapters = chaptersFor(body, siteHost, alias);
  const drama = {
    id: host.dramaId(alias),
    source: host.source,
    sourceId: alias,
    title: title,
    name: title,
    channelName: "短剧",
    totalEpisode: String(chapters.length),
    episodeCount: String(chapters.length),
  };
  if (desc !== "") {
    drama.desc = desc;
    drama.intro = desc;
  }
  if (cover !== "") {
    drama.cover = cover;
    drama.coverUrl = cover;
  }
  return { drama: drama, chapters: chapters };
}

function unescapeUrl(raw) {
  let value = String(raw)
    .replace(/\\u002[Ff]/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/");
  try {
    value = JSON.parse('"' + value.replace(/"/g, '\\"') + '"');
  } catch (error) {}
  return value;
}

function parsePlayUrl(body) {
  const source = playUrlPattern.exec(body);
  if (source !== null && /^https?:/i.test(source[1])) {
    return unescapeUrl(source[1]);
  }
  const escaped = escapedM3u8Pattern.exec(body);
  if (escaped !== null) {
    return unescapeUrl(escaped[0]);
  }
  const generic = genericM3u8Pattern.exec(body);
  return generic === null ? "" : unescapeUrl(generic[0]);
}

function resolveMedia(task) {
  const chapter = task && task.chapter ? task.chapter : {};
  let pageUrl = firstNonEmpty(chapter.pageUrl, chapter.videoUrl);
  if (pageUrl === "") {
    const alias = text(task && task.dramaId).split(":").pop();
    const episode = Number(chapter.currentEpisode || task.index || 0);
    if (alias !== "" && episode > 0) {
      pageUrl =
        getHost() +
        "/play/" +
        encodeURIComponent(alias) +
        "/" +
        Math.floor(episode);
    }
  }
  if (pageUrl === "") {
    throw new Error("黄瓜短剧播放地址无效");
  }
  const body = fetchPageWithRefresh(pageUrl, pageUrl, function (value) {
    return parsePlayUrl(value) !== "";
  });
  const media = parsePlayUrl(body);
  if (media === "") {
    throw new Error("黄瓜短剧没有返回播放地址");
  }
  return host.finishMedia({ url: media, referer: pageUrl });
}

module.exports = {
  validCategory: validCategory,
  categories: categories,
  home: home,
  catalogPage: catalogPage,
  search: search,
  detail: detail,
  resolveMedia: resolveMedia,
};
