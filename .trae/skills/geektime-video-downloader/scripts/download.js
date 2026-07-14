#!/usr/bin/env node
// 极客时间视频下载器 - 可复用版本
// Usage: node download.js --gcid <gcid> --gcess <gcess> --course <id> --out <dir> [--quality sd] [--only first] [--concurrency 6]
//
// 流程: articles → article/info → playAuth → VOD GetPlayInfo → m3u8 → ts → decrypt → merge → ffmpeg mp4

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

// ========== 参数解析 ==========
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = process.argv[i + 1];
      args[key] = val;
      i++;
    }
  }
  if (args.h || args.help) {
    console.log(`Usage: node download.js --gcid <gcid> --gcess <gcess> --course <id> --out <dir> [options]

Required:
  --gcid <gcid>           GeekTime Cookie GCID value
  --gcess <gcess>         GeekTime Cookie GCESS value
  --course <id>           Course ID (e.g. 101114301)
  --out <dir>             Output directory for MP4 files

Optional:
  --quality <q>           ld | sd | hd (default: sd)
  --only <idx>            Test mode: 'first' or numeric index
  --concurrency <n>       TS segment download concurrency (default: 6)
  --h | --help            Show this help
`);
    process.exit(0);
  }
  if (!args.gcid || !args.gcess || !args.course || !args.out) {
    console.error('ERROR: --gcid, --gcess, --course, --out are required');
    process.exit(1);
  }
  args.out = path.resolve(args.out);
  args.quality = args.quality || 'sd';
  args.concurrency = parseInt(args.concurrency || '6', 10);
  return args;
}

const ARGS = parseArgs();
const COOKIES = { gcid: ARGS.gcid, gcess: ARGS.gcess };
const COURSE_ID = parseInt(ARGS.course, 10);
const OUT_DIR = ARGS.out;
const QUALITY = ARGS.quality;
const CONCURRENCY = ARGS.concurrency;

const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAIcLeIt2wmIyXckgNhCGpMTAZyBGO+nk0/IdOrhIdfRR
gBLHdydsftMVPNHrRuPKQNZRslWE1vvgx80w9lCllIUCAwEAAQ==
-----END PUBLIC KEY-----`;
const BASE_URL = 'https://time.geekbang.org';

// ========== HTTP ==========
function httpPost(url, body, headers) {
  return new Promise(function(resolve, reject) {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'POST',
      headers: Object.assign({'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
        'Origin': BASE_URL, 'Referer': BASE_URL + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }, headers || {}) };
    const req = https.request(opts, function(res) {
      const chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch(e) { resolve({_raw: Buffer.concat(chunks).toString('utf8')}); }
      });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

function httpGet(url, headers) {
  return new Promise(function(resolve, reject) {
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'GET',
      headers: Object.assign({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }, headers || {}) };
    const req = https.request(opts, function(res) {
      const chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() { resolve({statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks)}); });
    });
    req.on('error', reject); req.end();
  });
}

function downloadFile(url, filepath, referer) {
  return new Promise(function(resolve, reject) {
    const mod = url.startsWith('https') ? https : http;
    let timeoutId;
    function doGet(targetUrl, redirectCount) {
      if (redirectCount > 5) { reject(new Error('too many redirects')); return; }
      const req = mod.get(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': referer || BASE_URL + '/', 'Origin': BASE_URL }
      }, function(res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (!loc.startsWith('http')) {
            const base = new URL(targetUrl);
            loc = base.protocol + '//' + base.host + (loc.startsWith('/') ? loc : '/' + loc);
          }
          doGet(loc, redirectCount + 1);
          return;
        }
        if (res.statusCode !== 200) { clearTimeout(timeoutId); reject(new Error('HTTP ' + res.statusCode)); return; }
        clearTimeout(timeoutId);
        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on('finish', function() { file.close(); resolve(filepath); });
        file.on('error', function(e) { try { fs.unlinkSync(filepath); } catch(_) {} reject(e); });
      });
      timeoutId = setTimeout(function() { req.destroy(); reject(new Error('timeout')); }, 120000);
      req.on('error', function(e) { clearTimeout(timeoutId); reject(e); });
    }
    doGet(url, 0);
  });
}

// ========== PlayAuth 解码 ==========
function decodePlayAuth(playAuth) {
  const signPos1 = new Date().getFullYear() / 100;
  const PlayAuthSign1 = [52, 58, 53, 121, 116, 102];
  const PlayAuthSign2 = [90, 91];
  function getSignStr(sign) { let s = ''; for (let i = 0; i < sign.length; i++) s += String.fromCharCode(sign[i] - i); return s; }
  const sign1 = getSignStr(PlayAuthSign1), sign2 = getSignStr(PlayAuthSign2);
  const signPos2 = playAuth.length - 2;
  const isSigned = playAuth.substring(signPos1, signPos1 + sign1.length) === sign1 && playAuth.substring(signPos2) === sign2;
  if (isSigned) {
    playAuth = playAuth.substring(0, signPos1) + playAuth.substring(signPos1 + sign1.length);
    playAuth = playAuth.substring(0, playAuth.length - sign2.length);
    const factor = signPos1;
    const newCodes = [];
    for (let i = 0; i < playAuth.length; i++) {
      const code = playAuth.charCodeAt(i);
      const r = Math.floor(code / factor);
      const z = factor / 10;
      if (r === z) newCodes.push(code); else newCodes.push(code - 1);
    }
    playAuth = String.fromCharCode.apply(null, newCodes);
  }
  return Buffer.from(playAuth, 'base64').toString('utf8');
}

function rsaEncrypt(data) {
  return crypto.publicEncrypt(
    { key: RSA_PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(data, 'utf8')
  ).toString('base64');
}

// ========== VOD URL 构造（关键：3 个坑）==========
function percentEncode(s) {
  return encodeURIComponent(s)
    .replace(/%20/g, '+')    // 坑1: 空格 → '+' (Go url.QueryEscape 风格)
    .replace(/\*/g, '%2A');  // 坑2: '*' → '%2A'
}

function buildVodUrl(playAuthJson, videoId, clientRand) {
  const data = JSON.parse(playAuthJson);
  const encryptedClientRand = rsaEncrypt(clientRand);
  const publicParams = {
    'AccessKeyId': data.AccessKeyId, 'SignatureMethod': 'HMAC-SHA1', 'SignatureVersion': '1.0',
    'SignatureNonce': crypto.randomUUID(), 'Format': 'JSON', 'Channel': 'HTML5', 'StreamType': 'video',
    'Rand': encryptedClientRand, 'Formats': '', 'Version': '2017-03-21'
  };
  const privateParams = {
    'Action': 'GetPlayInfo', 'AuthInfo': data.AuthInfo, 'AuthTimeout': '7200', 'PlayConfig': '{}',
    'PlayerVersion': '2.8.2', 'ReAuthInfo': '{}', 'SecurityToken': data.SecurityToken, 'VideoId': videoId
  };
  const allParams = [];
  Object.keys(publicParams).forEach(function(k) { allParams.push(percentEncode(k) + '=' + percentEncode(publicParams[k])); });
  Object.keys(privateParams).forEach(function(k) { allParams.push(percentEncode(k) + '=' + percentEncode(privateParams[k])); });
  allParams.sort();
  const cqs = allParams.join('&');
  const stringToSign = 'GET&' + percentEncode('/') + '&' + percentEncode(cqs);
  // 坑3: HMAC key 必须是 accessKeySecret + '&'
  const signature = crypto.createHmac('sha1', data.AccessKeySecret + '&').update(stringToSign).digest('base64');
  return 'https://vod.cn-shanghai.aliyuncs.com/?' + cqs + '&Signature=' + percentEncode(signature);
}

function parseM3U8(content) {
  const lines = content.split('\n');
  const tsFiles = [];
  let isVodEncrypt = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.indexOf('#EXT-X-KEY') === 0) isVodEncrypt = true;
    else if (line.indexOf('#') !== 0 && line.indexOf('.ts') >= 0) tsFiles.push(line);
  }
  return { tsFiles, isVodEncrypt };
}

function aesDecryptCBC(encrypted, key, iv) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  // PKCS5 unpadding
  const pad = decrypted[decrypted.length - 1];
  if (pad >= 1 && pad <= 16) {
    let valid = true;
    for (let i = 0; i < pad; i++) {
      if (decrypted[decrypted.length - 1 - i] !== pad) { valid = false; break; }
    }
    if (valid) return decrypted.subarray(0, decrypted.length - pad);
  }
  return decrypted;
}

function aesDecryptECB(encrypted, key) {
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  decipher.setAutoPadding(false);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// ========== Aliyun 私有加密：密钥派生 ==========
function getAESDecryptKey(cr, sr, plainText) {
  const crMD5 = crypto.createHash('md5').update(cr, 'utf8').digest('hex');
  const t1 = crMD5.substring(8, 24);
  const iv = Buffer.from(t1, 'utf8');  // 当作 ASCII 字节，不是 hex 解码
  const sd = Buffer.from(sr, 'base64');
  const dc1 = aesDecryptCBC(sd, iv, iv);
  const r2 = cr + dc1.toString('utf8');
  const r2MD5 = crypto.createHash('md5').update(r2, 'utf8').digest('hex');
  const t2 = r2MD5.substring(8, 24);
  const key2 = Buffer.from(t2, 'utf8');
  const pd = Buffer.from(plainText, 'base64');
  const d2c = aesDecryptCBC(pd, key2, iv);
  const b = Buffer.from(d2c.toString('utf8'), 'base64');
  return b.toString('hex');
}

// ========== TS 包解析 + AES-ECB 解密 ==========
const PACKET_LENGTH = 188;
const SYNC_BYTE = 0x47;
const PAYLOAD_START_MASK = 0x40;
const ATF_MASK = 0x30;
const ATF_PAYLOAD_ONLY = 0x01;
const ATF_FIELD_ONLY = 0x02;
const ATF_FIELD_FOLLOW_PAYLOAD = 0x03;

function parseTSHeader(buf) {
  return {
    syncByte: buf[0],
    transportErrorIndicator: (buf[1] & 0x80) >> 7,
    payloadUnitStartIndicator: (buf[1] & PAYLOAD_START_MASK) >> 6,
    pid: ((buf[1] & 0x1F) << 8) | buf[2],
    transportScramblingControl: (buf[3] & 0xC0) >> 6,
    adaptationField: (buf[3] & ATF_MASK) >> 4,
    continuityCounter: buf[3] & 0x0F,
    isPayloadStart: ((buf[1] & PAYLOAD_START_MASK) >> 6) === 1,
    hasAdaptationField: ((buf[3] & ATF_MASK) >> 4) === ATF_FIELD_ONLY || ((buf[3] & ATF_MASK) >> 4) === ATF_FIELD_FOLLOW_PAYLOAD,
    hasPayload: ((buf[3] & ATF_MASK) >> 4) === ATF_PAYLOAD_ONLY || ((buf[3] & ATF_MASK) >> 4) === ATF_FIELD_FOLLOW_PAYLOAD
  };
}

function decryptTSFile(data, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  if (data.length % PACKET_LENGTH !== 0) throw new Error('TS length not multiple of 188, got ' + data.length);
  const numPackets = Math.floor(data.length / PACKET_LENGTH);
  const videos = [], audios = [];
  let pesVideo = null, pesAudio = null;
  for (let packNo = 0; packNo < numPackets; packNo++) {
    const offset = packNo * PACKET_LENGTH;
    const buffer = data.subarray(offset, offset + PACKET_LENGTH);
    if (buffer[0] !== SYNC_BYTE) throw new Error('invalid sync byte at packet ' + packNo);
    const h = parseTSHeader(buffer);
    let headerLength = 4, atfLength = 0;
    if (h.hasAdaptationField) { atfLength = buffer[4]; headerLength += 1 + atfLength; }
    let pesHeaderLength = 0;
    if (h.isPayloadStart && headerLength + 8 < buffer.length) pesHeaderLength = 6 + 3 + buffer[headerLength + 8];
    const payloadStartOffset = offset + headerLength + pesHeaderLength;
    let payloadLength = PACKET_LENGTH - headerLength - pesHeaderLength;
    if (payloadLength < 0) payloadLength = 0;
    const payload = payloadLength > 0 ? buffer.subarray(headerLength + pesHeaderLength) : null;
    const packet = { h, payload, payloadStartOffset, payloadLength };
    if (h.pid === 0x100) {
      if (h.isPayloadStart) { if (pesVideo) videos.push(pesVideo); pesVideo = { packets: [] }; }
      if (pesVideo) pesVideo.packets.push(packet);
    } else if (h.pid === 0x101) {
      if (h.isPayloadStart) { if (pesAudio) audios.push(pesAudio); pesAudio = { packets: [] }; }
      if (pesAudio) pesAudio.packets.push(packet);
    }
  }
  if (pesVideo) videos.push(pesVideo);
  if (pesAudio) audios.push(pesAudio);

  function decryptPES(pesList) {
    for (let i = 0; i < pesList.length; i++) {
      const pes = pesList[i];
      let concat = Buffer.alloc(0);
      for (let p = 0; p < pes.packets.length; p++) {
        if (pes.packets[p].payload && pes.packets[p].payload.length > 0) {
          concat = Buffer.concat([concat, pes.packets[p].payload]);
        }
      }
      const length = concat.length;
      if (length === 0) continue;
      const decryptLen = Math.floor(length / 16) * 16;
      const decrypted = decryptLen > 0 ? aesDecryptECB(concat.subarray(0, decryptLen), key) : Buffer.alloc(0);
      const tail = decryptLen < length ? concat.subarray(decryptLen) : Buffer.alloc(0);
      const newBuf = Buffer.concat([decrypted, tail]);
      let pos = 0;
      for (let q = 0; q < pes.packets.length; q++) {
        const pkt = pes.packets[q];
        if (!pkt.payload || pkt.payload.length === 0) continue;
        newBuf.copy(data, pkt.payloadStartOffset, pos, pos + pkt.payload.length);
        pos += pkt.payload.length;
      }
    }
  }
  decryptPES(videos);
  decryptPES(audios);
  return data;
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

// ========== 单视频处理 ==========
async function processOne(article, cookieHeader, label) {
  console.log('\n=== ' + label + ': ' + article.title + ' ===');
  console.log('  aid=' + article.id + ' vid=' + article.videoId);

  const safeName = sanitizeFilename(article.title);
  const expectedMp4 = path.join(OUT_DIR, safeName + '.mp4');
  if (fs.existsSync(expectedMp4) && fs.statSync(expectedMp4).size > 100000) {
    console.log('  SKIP (already exists)');
    return expectedMp4;
  }

  const playAuthResp = await httpPost(BASE_URL + '/serv/v3/source_auth/video_play_auth', {
    aid: article.id, source_type: 1, video_id: article.videoId
  }, cookieHeader);
  if (!playAuthResp.data || !playAuthResp.data.play_auth) { console.log('  Failed to get play auth'); return null; }
  const playAuthJson = decodePlayAuth(playAuthResp.data.play_auth);

  const clientRand = crypto.randomUUID();
  const vodUrl = buildVodUrl(playAuthJson, article.videoId, clientRand);
  const playInfo = await httpGet(vodUrl);
  if (playInfo.statusCode !== 200) { console.log('  VOD HTTP ' + playInfo.statusCode); return null; }
  const playInfoJson = JSON.parse(playInfo.body.toString('utf8'));
  if (!playInfoJson.PlayInfoList || !playInfoJson.PlayInfoList.PlayInfo) { console.log('  No PlayInfoList'); return null; }

  let targetInfo = null;
  for (const p of playInfoJson.PlayInfoList.PlayInfo) {
    if (p.Definition && p.Definition.toLowerCase() === QUALITY) { targetInfo = p; break; }
  }
  if (!targetInfo) targetInfo = playInfoJson.PlayInfoList.PlayInfo[0];
  console.log('  Quality:', targetInfo.Definition, 'Size:', targetInfo.Size);

  const m3u8Resp = await httpGet(targetInfo.PlayURL);
  if (m3u8Resp.statusCode !== 200) { console.log('  m3u8 HTTP ' + m3u8Resp.statusCode); return null; }
  const parsed = parseM3U8(m3u8Resp.body.toString('utf8'));
  console.log('  TS segments:', parsed.tsFiles.length);

  let hexKey = null;
  if (parsed.isVodEncrypt && targetInfo.Plaintext) {
    hexKey = getAESDecryptKey(clientRand, targetInfo.Rand, targetInfo.Plaintext);
  }

  const tsUrlPrefix = targetInfo.PlayURL.substring(0, targetInfo.PlayURL.lastIndexOf('/') + 1);
  const tempDir = path.join(OUT_DIR, '_tmp_' + article.id);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('  Downloading...');
  let downloaded = 0, failed = 0;
  for (let b = 0; b < parsed.tsFiles.length; b += CONCURRENCY) {
    const batch = parsed.tsFiles.slice(b, b + CONCURRENCY);
    await Promise.all(batch.map(async function(ts) {
      const fp = path.join(tempDir, ts);
      try { await downloadFile(tsUrlPrefix + ts, fp, tsUrlPrefix); downloaded++; }
      catch(e) { failed++; console.log('    Failed: ' + ts + ' - ' + e.message); }
    }));
    process.stdout.write('  ' + downloaded + '/' + parsed.tsFiles.length + '\r');
  }
  console.log('\n  Downloaded:', downloaded, 'Failed:', failed);
  if (downloaded === 0) return null;

  console.log('  Merging + Decrypting...');
  const mergedPath = path.join(OUT_DIR, safeName + '.ts');
  const writeStream = fs.createWriteStream(mergedPath);
  const tsFiles = fs.readdirSync(tempDir).filter(function(f) { return f.indexOf('.ts') >= 0; }).sort();
  for (const ts2 of tsFiles) {
    let content = fs.readFileSync(path.join(tempDir, ts2));
    if (hexKey) {
      try { content = decryptTSFile(content, hexKey); }
      catch(e) { console.log('    Decrypt error on ' + ts2 + ': ' + e.message); }
    }
    writeStream.write(content);
  }
  writeStream.end();
  await new Promise(function(r) { writeStream.on('finish', r); });
  console.log('  Merged:', mergedPath, '(' + (fs.statSync(mergedPath).size / 1024 / 1024).toFixed(2) + ' MB)');

  console.log('  ffmpeg → mp4...');
  const mp4Path = mergedPath.replace('.ts', '.mp4');
  await new Promise(function(resolve, reject) {
    execFile('ffmpeg', ['-y', '-i', mergedPath, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', mp4Path], function(err, stdout, stderr) {
      if (err) { console.log('    ffmpeg error:', err.message); reject(err); } else resolve();
    });
  });
  if (fs.existsSync(mp4Path)) {
    console.log('  mp4:', mp4Path, '(' + (fs.statSync(mp4Path).size / 1024 / 1024).toFixed(2) + ' MB)');
    fs.unlinkSync(mergedPath);
    fs.rmSync(tempDir, { recursive: true, force: true });
    return mp4Path;
  }
  return null;
}

// ========== Main ==========
(async function() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cookieStr = 'GCID=' + COOKIES.gcid + '; GCESS=' + COOKIES.gcess;
  const cookieHeader = { 'Cookie': cookieStr };

  console.log('Course:', COURSE_ID, '| Quality:', QUALITY, '| Out:', OUT_DIR);
  const articles = await httpPost(BASE_URL + '/serv/v1/column/articles', {
    cid: String(COURSE_ID), order: 'earliest', prev: 0, sample: false, size: 500
  }, cookieHeader);
  if (!articles.data || !articles.data.list) { console.log('Failed:', JSON.stringify(articles).substring(0, 500)); return; }
  console.log('Articles:', articles.data.list.length);

  const videoArticles = [];
  for (let i = 0; i < articles.data.list.length; i++) {
    const a = articles.data.list[i];
    const info = await httpPost(BASE_URL + '/serv/v3/article/info', { id: a.id }, cookieHeader);
    if (info.data && info.data.info && info.data.info.video && info.data.info.video.id) {
      videoArticles.push({ id: a.id, title: a.article_title, videoId: info.data.info.video.id });
    }
  }
  console.log('Videos:', videoArticles.length);

  if (videoArticles.length === 0) { console.log('No videos found in this course'); return; }

  const onlyArg = ARGS.only;
  let targetList = videoArticles;
  if (onlyArg) {
    if (onlyArg === 'first') targetList = [videoArticles[0]];
    else { const idx = parseInt(onlyArg, 10); if (!isNaN(idx)) targetList = [videoArticles[idx]]; }
  }

  const results = [];
  for (let j = 0; j < targetList.length; j++) {
    try {
      const result = await processOne(targetList[j], cookieHeader, '[' + (j + 1) + '/' + targetList.length + ']');
      results.push({ article: targetList[j], success: !!result, path: result });
    } catch(e) {
      console.log('  ERROR:', e.message);
      results.push({ article: targetList[j], success: false, error: e.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  const successCount = results.filter(function(r) { return r.success; }).length;
  console.log('Total:', results.length, 'Success:', successCount, 'Failed:', results.length - successCount);
  for (let k = 0; k < results.length; k++) {
    const r = results[k];
    console.log((r.success ? 'OK' : 'FAIL') + ' - ' + r.article.title + (r.path ? ' -> ' + path.basename(r.path) : ''));
  }
  const reportPath = path.join(OUT_DIR, '_download_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log('Report:', reportPath);
})().catch(function(e) { console.error('FATAL:', e.message); console.error(e.stack); process.exit(1); });
