# 健迹 · 个人健康助手

> iCAN 数字媒体赛道参赛作品 · 把分散的健康数据整理成医生看得懂的就诊备忘

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Offline Ready](https://img.shields.io/badge/Offline-Ready-brightgreen.svg)](#离线能力)
[![Pure Frontend](https://img.shields.io/badge/Pure-Frontend-8A2BE2.svg)](#技术栈)

---

## 产品定位

「健迹」是一款**纯前端、零后端、完全离线可运行**的个人健康助手。它帮用户把每天的血压、心率、睡眠、血糖等零散记录，通过 **AI 辅助录入 → 规则统计 → 人工核对** 三层链路，自动整理成医生一眼能看懂的就诊卡。

## 核心亮点

- 🧠 **AI 辅助录入**：文字描述自动提取字段 + 原文证据高亮定位
- 📸 **真实 OCR**：支持百度智能云 OCR / Tesseract.js 双引擎
- 🩺 **就诊卡一键生成**：概况统计 + 医生速览摘要 + 关键事件 + 可编辑自述，导出 PDF
- 📈 **趋势可视化**：正常参考范围带 + 异常点红色标注
- 💬 **AI 问答带数据引用**：基于本地真实数据回答，标注数据来源范围
- 🔒 **隐私优先**：所有数据存浏览器 localStorage，Key 不上传任何服务器
- 📴 **完全离线**：所有依赖本地化，断网也能用

## 功能模块

| 模块 | 说明 |
|------|------|
| 概览首页 | 今日洞察、近7天统计、就诊准备入口 |
| 健康记录 | 手动录入 / AI 文字提取 / 图片 OCR 三种录入 |
| 趋势回顾 | 7/14/30 天趋势图，含正常范围带与异常点 |
| 就诊准备 | 自动生成就诊卡，支持导出 PDF |
| AI 助手 | 本地规则 + 云端大模型（可选） |
| 服药管理 | 药物清单 + 每日打卡日历 |
| 数据与隐私 | 数据导出/清空、OCR 引擎配置 |

## 快速开始

### 本地运行（无需联网、无需安装）

```bash
# 克隆后进入目录
cd jianji

# 启动本地服务器（任选其一）
python -m http.server 8080
# 或
npx serve
```

浏览器打开 http://127.0.0.1:8080

### 一键部署公网

拖到 [Netlify Drop](https://app.netlify.com/drop) 即可获得公开链接，约 1 分钟。

## AI 助手 API 配置

AI 助手支持 **本地规则模式**（默认）和 **云端大模型模式**（需配置）。

### 配置入口
「AI 助手」页 → 展开「云端 AI 设置」面板

### 配置字段

| 字段 | 说明 | 示例 |
|------|------|------|
| API 地址 (Base URL) | OpenAI 兼容接口 v1 地址 | `https://api.deepseek.com/v1` |
| API Key | 服务商密钥 | `sk-xxxxxxxxxxxxxxxx` |
| 模型 | 模型名称 | `deepseek-chat` |

### 内置预设

| 服务商 | Base URL | Model |
|--------|----------|-------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |

### 接口规范
- 端点：`POST {Base URL}/chat/completions`
- 鉴权：`Authorization: Bearer {API Key}`
- 超时：30 秒
- Key 存储：仅浏览器 localStorage

## 技术栈

纯 HTML/CSS/JavaScript，无构建工具，零 npm 依赖。

| 依赖 | 用途 | 本地化 |
|------|------|--------|
| Tailwind CSS | 样式 | ✅ `vendor/tailwind.js` |
| Chart.js | 图表 | ✅ `vendor/chart.umd.min.js` |
| Lucide | 图标 | ✅ `vendor/lucide.min.js` |
| html2canvas | PDF 截图 | ✅ `vendor/html2canvas.min.js` |
| jsPDF | PDF 生成 | ✅ `vendor/jspdf.umd.min.js` |
| Tesseract.js | OCR | ✅ `vendor/tesseract.min.js` |

## 离线能力

| 功能 | 离线 | 备注 |
|------|:----:|------|
| 全部页面、录入、统计、图表 | ✅ | 完全离线 |
| 本地规则 AI 问答 | ✅ | 完全离线 |
| 就诊卡导出 PDF | ✅ | html2canvas + jsPDF 本地化 |
| OCR 演示图片识别 | ✅ | 内置演示图 |
| Tesseract.js OCR | ⚠️ | 首次需联网下载语言包 |
| 百度 OCR / 云端 AI | ⚠️ | 需联网 + API Key |

## 项目结构

```
.
├── index.html          # 单页应用入口
├── js/
│   ├── data.js         # 数据层（localStorage + 演示数据）
│   ├── ai.js           # 本地规则提取引擎（含证据定位）
│   ├── chart-utils.js  # Chart.js 封装（参考线/异常点）
│   ├── ocr.js          # OCR 双引擎
│   ├── overview.js     # 首页
│   ├── record.js       # 录入页
│   ├── trend.js        # 趋势页
│   ├── visit.js        # 就诊准备
│   ├── assistant.js    # AI 助手
│   ├── medication.js   # 服药管理
│   ├── privacy.js      # 数据与隐私
│   ├── wheel.js        # 选择转轮
│   └── app.js          # 路由/导航
├── vendor/             # 全部本地化依赖
├── .gitignore
└── README.md
```

## 数据与隐私

- 所有数据存储在浏览器 `localStorage`
- 清除浏览器数据即删除全部记录
- 隐私页支持一键导出 JSON 备份 / 清空全部
- API Key 仅存本机，不上传任何服务器

## 免责声明

本工具仅用于个人健康数据整理，**不构成医疗建议**。如有健康问题请咨询专业医生。

## License

MIT
