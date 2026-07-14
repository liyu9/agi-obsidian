# 阿里云 VOD GetPlayInfo 签名实现

## 协议流程

```
playAuth (base64 + 签名混淆)
    ↓ decodePlayAuth (解混淆 + base64 decode)
playAuthJson = { SecurityToken, AuthInfo, VideoMeta, AccessKeyId, PlayDomain, AccessKeySecret, ... }
    ↓ buildVodUrl
canonicalQueryString (cqs)
    ↓ percentEncode(cqs)
stringToSign = "GET" + "&" + percentEncode("/") + "&" + percentEncode(cqs)
    ↓ HMAC-SHA1(secret + "&", stringToSign)
Signature (base64)
    ↓
最终 URL: https://vod.cn-shanghai.aliyuncs.com/?<cqs>&Signature=<encoded>
```

## Reference: Go 实现

```go
// geektime-downloader/internal/video/vod/vod.go
func BuildVodGetPlayInfoURL(playAuth, videoID, clientRand string) (string, error) {
    decodedPlayAuth := decodePlayAuth(playAuth)
    var playAuthData PlayAuthData
    json.Unmarshal([]byte(decodedPlayAuth), &playAuthData)

    encryptedClientRand, _ := pc.RSAEncrypt([]byte(clientRand))

    publicParams := map[string]string{
        "AccessKeyId": playAuthData.AccessKeyID,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureVersion": "1.0",
        "SignatureNonce": uuid.NewString(),
        "Format": "JSON",
        "Channel": "HTML5",
        "StreamType": "video",
        "Rand": encryptedClientRand,
        "Formats": "",
        "Version": "2017-03-21",
    }
    privateParams := map[string]string{
        "Action": "GetPlayInfo",
        "AuthInfo": playAuthData.AuthInfo,
        "AuthTimeout": "7200",
        "PlayConfig": "{}",
        "PlayerVersion": "2.8.2",
        "ReAuthInfo": "{}",
        "SecurityToken": playAuthData.SecurityToken,
        "VideoId": videoID,
    }
    allParams := getAllParams(publicParams, privateParams)
    cqs := getCQS(allParams)
    stringToSign := "GET" + "&" + percentEncode("/") + "&" + percentEncode(cqs)
    signature := pc.HmacSHA1Signature(playAuthData.AccessKeySecret, stringToSign)
    return "https://vod.cn-shanghai.aliyuncs.com/?" + cqs + "&Signature=" + percentEncode(signature), nil
}
```

```go
// geektime-downloader/internal/pkg/crypto/hmac.go
func HmacSHA1Signature(accessKeySecret, stringToSign string) string {
    key := accessKeySecret + "&"   // ← 关键！
    mac := hmac.New(sha1.New, []byte(key))
    mac.Write([]byte(stringToSign))
    return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func percentEncode(s string) string {
    return url.QueryEscape(s)  // ← Go 风格：空格 → '+'，'*' → '%2A'
}
```

## 3 个常见坑

### 坑 1: `percentEncode` 空格

| 编码器 | `"a b"` 结果 |
|--------|--------------|
| Go `url.QueryEscape` | `"a+b"` |
| JS `encodeURIComponent` | `"a%20b"` |

错误版本（我的第一版）：
```js
function percentEncode(s) {
  return encodeURIComponent(s)
    .replace(/\+/g, '%20')   // ← 这里错了！JS 不会输出 '+'
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}
```

正确版本：
```js
function percentEncode(s) {
  return encodeURIComponent(s)
    .replace(/%20/g, '+')    // JS 的 %20 转成 Go 风格的 '+'
    .replace(/\*/g, '%2A');
}
```

### 坑 2: HMAC 密钥

阿里云 VOD 标准模式：`key = accessKeySecret + "&"`

```js
// 错
crypto.createHmac('sha1', data.AccessKeySecret).update(stringToSign).digest('base64')

// 对
crypto.createHmac('sha1', data.AccessKeySecret + '&').update(stringToSign).digest('base64')
```

### 坑 3: `*` 编码

Go 的 `url.QueryEscape` 把 `*` 编码为 `%2A`，JS 的 `encodeURIComponent` 不编码。需要显式补上。

## 调试技巧

HTTP 400 响应 body 包含服务端期望的 `string to sign`：

```json
{
  "RequestId": "...",
  "Message": "Specified signature is not matched with our calculation. server string to sign is:GET&%2F&AccessKeyId%3DSTS...%26Action%3D...&..."
}
```

提取后跟自己生成的 `stringToSign` 逐字符对比即可定位问题。

## Aliyun 私有加密：TS 解密密钥派生

```go
// geektime-downloader/internal/pkg/crypto/aes.go
func GetAESDecryptKey(cr, sr, plainText string) string {
    crMD5 := fmt.Sprintf("%x", md5.Sum([]byte(cr)))
    t1 := crMD5[8:24]
    iv := []byte(t1)   // ← 注意：当作 ASCII 字节，不是 hex 解码
    sd, _ := base64.StdEncoding.DecodeString(sr)
    dc1 := AESDecryptCBC(sd, iv, iv)
    r2 := cr + string(dc1)
    r2MD5 := fmt.Sprintf("%x", md5.Sum([]byte(r2)))
    t2 := r2MD5[8:24]
    key2 := []byte(t2)
    pd, _ := base64.StdEncoding.DecodeString(plainText)
    d2c := AESDecryptCBC(pd, key2, iv)
    b, _ := base64.StdEncoding.DecodeString(string(d2c))
    return fmt.Sprintf("%x", b)
}
```

**注意**：`t1` 和 `t2` 是 hex 字符串（如 `"1a2b3c4d5e6f7a8b"`），但作为 IV/key 时**不进行 hex decode**，直接当 16 字节 ASCII 用。

## TS 包解析 + AES-ECB

Aliyun VOD 不使用标准 HLS AES-128-CBC，而是：

1. 解析 188 字节 TS 包
2. 收集 PID=0x100 (视频) 和 PID=0x101 (音频) 的 PES 负载
3. 把每个 PES 的所有分片 payload 拼接
4. 用派生的密钥做 **AES-128-ECB** 解密（`floor(length/16)*16` 块）
5. 写回原 buffer

详见 [geektime-downloader/internal/pkg/m3u8/tsparser.go](https://github.com/nicoxiang/geektime-downloader/blob/main/internal/pkg/m3u8/tsparser.go)。
