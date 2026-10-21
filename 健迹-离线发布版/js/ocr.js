/**
 * 健迹 - OCR 识别模块
 * 支持两种真实 OCR 引擎 + 演示模式：
 *   1. 百度智能云 OCR（需配置 API Key / Secret Key，识别快、中文准）
 *   2. Tesseract.js（纯前端 WASM，无需 Key，中文稍慢）
 *   3. 演示模式（无配置时的模拟，仅用于展示流程）
 * 识别出的文字统一交由 JJAI.extract() 提取字段，进入同一套草稿核对流程。
 */

const JJOCR = {
  // 百度 OCR access_token 缓存（内存，刷新页面后重取）
  _baiduToken: null,
  _baiduTokenExpire: 0,

  /**
   * 对图片做 OCR，返回 { ok, text, engine, error }
   * @param {File|string} file - 图片文件或 dataURL
   * @param {Function} onProgress - 进度回调 (pct, msg)
   */
  async recognize(file, onProgress) {
    const cfg = JJData.getOCRConfig();
    onProgress = onProgress || (() => {});

    // 优先百度 OCR
    if (cfg.provider === 'baidu' && cfg.baidu_api_key && cfg.baidu_secret_key) {
      try {
        onProgress(10, '正在连接百度 OCR…');
        const text = await this._baiduOCR(file, onProgress);
        return { ok: true, text, engine: 'baidu' };
      } catch (e) {
        console.error('百度OCR失败:', e);
        // 百度失败自动降级到 Tesseract
        onProgress(0, '百度 OCR 失败，尝试本地 Tesseract…');
      }
    }

    // Tesseract.js 纯前端
    if (cfg.provider === 'tesseract' || cfg.baidu_api_key) {
      try {
        const text = await this._tesseractOCR(file, onProgress);
        return { ok: true, text, engine: 'tesseract' };
      } catch (e) {
        console.error('Tesseract失败:', e);
        onProgress(0, '本地识别失败，使用演示模式…');
      }
    }

    // 兜底：演示模式
    return { ok: true, text: this._demoText(), engine: 'demo' };
  },

  // ========== 百度 OCR ==========
  async _baiduOCR(file, onProgress) {
    const cfg = JJData.getOCRConfig();
    // 1. 取 access_token
    const token = await this._getBaiduToken(cfg.baidu_api_key, cfg.baidu_secret_key);
    onProgress(40, 'OCR 识别中…');

    // 2. 图片转 base64
    const base64 = await this._fileToBase64(file);

    // 3. 调用通用文字识别（高精度）
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`;
    const body = new URLSearchParams();
    body.append('image', base64);
    body.append('language_type', 'CHN_ENG');

    const resp = await this._fetchWithCORSProxy(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (resp.error_code) {
      throw new Error(`百度OCR错误 ${resp.error_code}: ${resp.error_msg}`);
    }
    const text = (resp.words_result || []).map(w => w.words).join('\n');
    if (!text.trim()) throw new Error('未识别到文字');
    return text;
  },

  async _getBaiduToken(apiKey, secretKey) {
    if (this._baiduToken && Date.now() < this._baiduTokenExpire) return this._baiduToken;
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(secretKey)}`;
    const resp = await this._fetchWithCORSProxy(url, { method: 'POST' });
    if (resp.error) throw new Error(`百度Token错误: ${resp.error_description || resp.error}`);
    this._baiduToken = resp.access_token;
    this._baiduTokenExpire = Date.now() + (resp.expires_in - 60) * 1000;
    return this._baiduToken;
  },

  // 带 CORS 代理的 fetch（百度 API 不支持浏览器跨域，用 allorigins 代理）
  async _fetchWithCORSProxy(url, opts) {
    // 先尝试直连（部分环境可能支持）
    try {
      const r = await fetch(url, opts);
      return await r.json();
    } catch (e) {
      // 直连失败，走 allorigins 代理
      const proxyUrl = `https://api.allorigins.win/post?url=${encodeURIComponent(url)}`;
      const r = await fetch(proxyUrl, opts);
      const data = await r.json();
      // allorigins 返回 { contents: "..." } 或直接内容
      if (data.contents) {
        try { return JSON.parse(data.contents); } catch { return data.contents; }
      }
      return data;
    }
  },

  // ========== Tesseract.js ==========
  async _tesseractOCR(file, onProgress) {
    if (typeof Tesseract === 'undefined') {
      onProgress(5, '加载 Tesseract.js…');
      await this._loadTesseract();
    }
    onProgress(20, '加载中文语言包（首次较慢）…');
    const result = await Tesseract.recognize(file, 'chi_sim+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          onProgress(20 + Math.round(m.progress * 70), '识别中…');
        }
      }
    });
    const text = result.data.text || '';
    if (!text.trim()) throw new Error('未识别到文字');
    return text;
  },

  _loadTesseract() {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) return resolve();
      const s = document.createElement('script');
      s.src = 'vendor/tesseract.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Tesseract.js 加载失败，请检查网络'));
      document.head.appendChild(s);
    });
  },

  // ========== 工具 ==========
  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (typeof file === 'string') {
        // dataURL
        const idx = file.indexOf(',');
        resolve(idx >= 0 ? file.slice(idx + 1) : file);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const idx = result.indexOf(',');
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  _demoText() {
    return '血压 124/80 mmHg  心率 72 次/分  血氧 98%  空腹血糖 5.5 mmol/L  睡眠 7.0 小时';
  }
};

window.JJOCR = JJOCR;
