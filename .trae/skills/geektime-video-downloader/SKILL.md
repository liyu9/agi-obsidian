---
name: "geektime-video-downloader"
description: "从极客时间下载视频课程到本地MP4。流程: 课程文章列表 → 视频文章识别 → playAuth 解密 → VOD GetPlayInfo签名 → m3u8分片下载 → Aliyun私有加密解密 → 合并转MP4 → ffprobe校验。触发: 用户要求下载极客时间视频课、获取视频文件、备份视频课程。"
---

# 极客时间视频下载器

> 适用于任意极客时间视频课。**不依赖Chrome浏览器**，纯 API 调用 + Node.js 加密。

## 前置条件

- Node.js（已内置 `crypto` 模块，无需 npm 安装）
- ffmpeg/ffprobe（用于转码与校验）
- 极客时间账号 + Cookie（`GCID` 和 `GCESS`）

## 获取 Cookie

方法一：浏览器开发者工具
1. 登录 https://time.geekbang.org
2. F12 → Application → Cookies → 复制 `GCID` 和 `GCESS` 的值

方法二：使用 `scripts/extract-cookies.js`（通过 CDP 连接本地 Chrome 提取）

## 使用方法

```bash
node scripts/download.js \
  --gcid "303e997-149f0f1-620d3cf-79369f2" \
  --gcess "BgwBAQMEzZcXagQEAI0nAAcEOj20cgkBAQgBAwEId7k4..." \
  --course 101114301 \
  --out "D:\path\to\output\videos" \
  --quality sd
```

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--gcid` | ✅ | - | 极客时间 Cookie GCID 值 |
| `--gcess` | ✅ | - | 极客时间 Cookie GCESS 值（base64 字符串） |
| `--course` | ✅ | - | 课程 ID（URL `course/detail/101114301-952586` 中第一个数字） |
| `--out` | ✅ | - | MP4 输出目录 |
| `--quality` | ❌ | sd | `ld` (标清) / `sd` (高清) / `hd` (超清) |
| `--only` | ❌ | - | 测试用：`first` 或数字索引（仅处理一个视频） |
| `--concurrency` | ❌ | 6 | 单视频内的 ts 分片下载并发数 |

## 输出

```
<out>/
├── L00-课程介绍.md-equivalent.mp4      ← 视频标题作为文件名
├── L01-xxx.mp4
├── ...
├── _download_report.json              ← 下载结果汇总
├── _validation_report.json            ← ffprobe 校验报告
└── _tmp_<articleId>/                  ← 下载中临时目录，完成后自动删除
```

## 校验

下载完成后用 ffprobe 批量校验：

```bash
node scripts/validate.js "D:\path\to\output\videos"
```

校验标准：
- 视频流存在 + 宽度 >= 1280
- 音频流存在 + 采样率 >= 44100
- 时长 > 10 秒
- 大小 > 100KB

## 跳过已下载（断点续传）

脚本会跳过 `>100KB` 的 MP4 文件。中断后重新运行会自动继续未完成的视频。

---

## 技术细节（实现关键）

视频链路涉及 3 个阿里云 VOD 的非标准实现，必须严格遵守：

### 1. 签名构造

```
publicParams = { AccessKeyId, SignatureMethod, SignatureVersion, SignatureNonce, Format, Channel, StreamType, Rand, Formats, Version }
privateParams = { Action: 'GetPlayInfo', AuthInfo, AuthTimeout, PlayConfig, PlayerVersion, ReAuthInfo, SecurityToken, VideoId }

cqs = sort + join('&')  of  [percentEncode(k)+'='+percentEncode(v) for k,v in params]
stringToSign = 'GET' + '&' + percentEncode('/') + '&' + percentEncode(cqs)
Signature = base64(HMAC-SHA1(accessKeySecret + '&', stringToSign))
```

**3 个坑（必须按 Go 参考实现）：**

| 坑 | 错误做法 | 正确做法 |
|----|----------|----------|
| `percentEncode` 空格 | `encodeURIComponent` (输出 `%20`) | Go `url.QueryEscape` 风格 (输出 `+`) |
| `percentEncode` 星号 | 不编码 `*` | 编码为 `%2A` |
| HMAC 密钥 | `accessKeySecret` | `accessKeySecret + "&"`（阿里云标准） |

**调试技巧**：HTTP 400 响应里会返回服务端期望的 `string to sign`，可逐字符 diff。

### 2. Aliyun 私有加密密钥派生

playAuth 解码后从 `PlayInfo` 拿到 `Rand` 和 `Plaintext`，需要经过 4 步派生真正的 TS 解密密钥：

```
crMD5 = md5(clientRand).hex                    // 32 hex
t1 = crMD5[8:24]                              // 16 hex chars = 16 bytes
iv = t1                                       // 当作 ASCII 字节用，不是 hex 解码
sd = base64Decode(playInfo.Rand)
dc1 = aes-128-cbc-decrypt(sd, iv, iv)         // + PKCS5 unpadding
r2 = clientRand + dc1.toString('utf8')
r2MD5 = md5(r2).hex
t2 = r2MD5[8:24]
key2 = t2
pd = base64Decode(playInfo.Plaintext)
d2c = aes-128-cbc-decrypt(pd, key2, iv)
b = base64Decode(d2c.toString('utf8'))
return hex(b)                                 // ← 这才是 16 字节 AES 密钥（hex 字符串）
```

### 3. TS 包解析 + AES-ECB 解密

Aliyun VOD 不使用标准 HLS AES-128-CBC，而是：
- 解析 188 字节 TS 包
- 收集 PID=0x100 (视频) 和 PID=0x101 (音频) 的 PES 负载
- 把每个 PES 的所有分片 payload 拼接
- 用 `getAESDecryptKey` 派生的密钥做 **AES-128-ECB** 解密（`floor(length/16)*16` 块）
- 写回原 buffer

```javascript
const PACKET_LENGTH = 188;
const SYNC_BYTE = 0x47;
// 详见 scripts/download.js decryptTSFile()
```

---

## 已知问题 & 限制

- **未完成**：videos 文件夹的 README/_index.md 仍引用旧的 `02-文本摘要` 目录，需手动同步
- **限制**：单视频最多 600+ ts 分片，下载 + 解密 + 合并约 2-5 分钟/个（视网速）
- **限制**：所有 44 个视频约 4GB，需要充足磁盘空间
- **限制**：极客时间 AuthInfo 有效期 2 小时，超长批量下载可能中途失效

## 触发条件

- 「极客时间」+「下载视频/下载课程视频/获取视频/下载到本地/视频备份」
- 提供 Cookie + 课程 URL/ID，要求下载视频

## 复用的步骤清单

1. 询问用户：Cookie (gcid/gcess) + 课程 ID + 输出目录
2. 跑 `download.js`，让其自然完成（可能数十分钟）
3. 跑 `validate.js` 校验
4. 输出汇总报告

## 文件清单

| 文件 | 用途 |
|------|------|
| `scripts/download.js` | 主下载脚本（参数化） |
| `scripts/validate.js` | 批量 ffprobe 校验 |
| `references/aliyun-signature.md` | 签名实现细节（深入） |
