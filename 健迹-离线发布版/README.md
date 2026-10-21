# 健迹 · 个人健康助手 — 离线发布版

> iCAN 数字媒体赛道参赛作品 · 纯前端离线可运行

## 一、快速启动

本项目所有依赖已本地化，**无需联网、无需 npm install**。

### 方式一：本地服务器（推荐）
```bash
# 在本目录下执行
python -m http.server 8080
```
浏览器打开 http://127.0.0.1:8080

### 方式二：直接打开
双击 `index.html` 即可（部分浏览器对 file:// 协议的 localStorage 有限制，建议用方式一）。

---

## 二、功能模块

| 模块 | 说明 |
|------|------|
| 概览首页 | 今日洞察、近7天统计、就诊准备入口 |
| 健康记录 | 手动录入 / AI 文字提取 / 图片 OCR 三种录入方式 |
| 趋势回顾 | 7/14/30 天趋势图，含正常参考范围带与异常点标注 |
| 就诊准备 | 自动生成就诊卡（概况+速览摘要+关键事件+可编辑自述），支持导出 PDF |
| AI 助手 | 基于本地健康数据的问答，支持接入云端大模型 |
| 服药管理 | 药物清单 + 每日打卡日历 |
| 选择转轮 | 随机选择工具 |
| 数据与隐私 | 数据导出/清空、OCR 引擎配置 |

---

## 三、AI 助手 API 配置接口

AI 助手支持两种模式：**本地规则模式**（默认，无需配置）和 **云端大模型模式**（需配置 API）。

### 3.1 配置入口
进入「AI 助手」页 → 展开顶部「云端 AI 设置」面板。

### 3.2 配置字段

| 字段 | 说明 | 示例 |
|------|------|------|
| API 地址 (Base URL) | OpenAI 兼容接口的 v1 地址 | `https://api.deepseek.com/v1` |
| API Key | 服务商颁发的密钥 | `sk-xxxxxxxxxxxxxxxx` |
| 模型 | 模型名称 | `deepseek-chat` |

### 3.3 内置预设（一键填充）
| 服务商 | Base URL | Model |
|--------|----------|-------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |

### 3.4 接口调用规范
- 接口：`POST {Base URL}/chat/completions`
- 鉴权：`Authorization: Bearer {API Key}`
- 请求体（OpenAI 兼容格式）：
  ```json
  {
    "model": "deepseek-chat",
    "messages": [
      { "role": "system", "content": "你是「健迹」个人健康助手中的 AI 模块..." },
      { "role": "user", "content": "我的健康记录(JSON)...\n\n我的问题：..." }
    ],
    "temperature": 0.3
  }
  ```
- 超时：30 秒
- Key 存储：仅保存在浏览器 localStorage，不上传任何服务器

### 3.5 操作按钮
- **保存并启用**：写入配置，AI 助手切换为云端模式
- **测试连接**：发送"你好"测试请求，显示模型回复或错误信息
- **清除配置**：删除 Key，回到本地规则模式

### 3.6 系统提示词约束（内置）
云端模式下，AI 被严格约束：
1. 只能基于用户提供的健康记录 JSON 做客观归纳
2. 不做医学诊断、不推测病因、不给用药建议
3. 数据缺失时明确说明，不编造数值
4. 回复末尾固定附："以上仅为个人数据整理，不构成医疗建议。"

---

## 四、离线能力说明

| 功能 | 离线可用 | 备注 |
|------|---------|------|
| 所有页面浏览、数据录入、统计、图表 | ✅ | 完全离线 |
| 本地规则 AI 问答 | ✅ | 完全离线 |
| 就诊卡导出 PDF | ✅ | html2canvas + jsPDF 已本地化 |
| OCR 演示图片识别 | ✅ | 内置 canvas 演示图 |
| Tesseract.js OCR（中文） | ⚠️ 需联网 | 需下载中文语言包（首次使用） |
| 百度 OCR | ⚠️ 需联网 | 需配置 API Key |
| 云端大模型 AI | ⚠️ 需联网 | 需配置 API Key |

---

## 五、技术栈
- 纯 HTML/CSS/JavaScript，无构建工具
- Tailwind CSS（Play CDN，已本地化）
- Chart.js（图表，已本地化）
- Lucide（图标，已本地化）
- html2canvas + jsPDF（PDF 导出，已本地化）
- Tesseract.js（OCR，可选，需联网下载语言包）

---

## 六、数据存储
所有数据存储在浏览器 localStorage，清除浏览器数据即删除。隐私页支持一键导出 JSON / 清空全部数据。
