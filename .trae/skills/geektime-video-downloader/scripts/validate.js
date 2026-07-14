#!/usr/bin/env node
// 批量 ffprobe 校验脚本
// Usage: node validate.js <videoDir>

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const VIDEO_DIR = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!VIDEO_DIR) {
  console.error('Usage: node validate.js <videoDir>');
  process.exit(1);
}

function probe(filepath) {
  return new Promise(function(resolve) {
    execFile('ffprobe', [
      '-v', 'error',
      '-show_format',
      '-show_streams',
      '-print_format', 'json',
      filepath
    ], function(err, stdout, stderr) {
      if (err) { resolve({ ok: false, error: err.message, stderr: (stderr || '').substring(0, 500) }); return; }
      try {
        const info = JSON.parse(stdout);
        const video = (info.streams || []).find(s => s.codec_type === 'video');
        const audio = (info.streams || []).find(s => s.codec_type === 'audio');
        resolve({
          ok: true,
          duration: parseFloat(info.format ? info.format.duration : 0),
          bitrate: parseInt(info.format ? info.format.bit_rate : 0),
          size: parseInt(info.format ? info.format.size : 0),
          nb_streams: (info.streams || []).length,
          video: video ? { codec: video.codec_name, width: video.width, height: video.height, fps: video.r_frame_rate } : null,
          audio: audio ? { codec: audio.codec_name, sample_rate: audio.sample_rate, channels: audio.channels } : null
        });
      } catch(e) { resolve({ ok: false, error: 'JSON parse: ' + e.message }); }
    });
  });
}

(async function() {
  const files = fs.readdirSync(VIDEO_DIR).filter(f => f.toLowerCase().endsWith('.mp4')).sort();
  console.log('Validating ' + files.length + ' MP4 files in ' + VIDEO_DIR + '\n');

  const results = [];
  let passCount = 0, failCount = 0;
  let totalDuration = 0, totalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const fp = path.join(VIDEO_DIR, files[i]);
    const r = await probe(fp);
    let status, info;
    if (r.ok && r.video && r.audio && r.duration > 10) {
      status = 'PASS';
      passCount++;
      totalDuration += r.duration;
      totalSize += r.size;
      info = r.video.width + 'x' + r.video.height + ' ' + r.video.codec + ' / ' + r.audio.codec + ' ' + r.duration.toFixed(0) + 's';
    } else {
      status = 'FAIL';
      failCount++;
      info = r.error || 'Invalid streams';
    }
    console.log('[' + (i + 1) + '/' + files.length + '] ' + status + ' | ' + files[i] + ' | ' + info);
    results.push({ file: files[i], status, info: r });
  }

  console.log('\n=== VALIDATION SUMMARY ===');
  console.log('Total: ' + files.length);
  console.log('Pass:  ' + passCount);
  console.log('Fail:  ' + failCount);
  console.log('Total duration: ' + (totalDuration / 3600).toFixed(2) + ' hours (' + totalDuration.toFixed(0) + ' seconds)');
  console.log('Total size: ' + (totalSize / 1024 / 1024 / 1024).toFixed(2) + ' GB');

  const reportPath = path.join(VIDEO_DIR, '_validation_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log('Report saved to: ' + reportPath);

  process.exit(failCount > 0 ? 1 : 0);
})().catch(function(e) { console.error('FATAL:', e.message); process.exit(1); });
