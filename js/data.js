/**
 * 健迹 - 数据模型与本地存储
 * 使用 localStorage 持久化，数据结构对齐设计文档
 */

const DB_KEY = 'jianji_v1';

// 字段定义 - 与设计文档表3对齐
const HEALTH_FIELDS = {
  date:          { label: '记录日期', type: 'date', required: true },
  sleep_hours:   { label: '睡眠时长(小时)', type: 'number', min: 0, max: 24 },
  activity_min:  { label: '活动时长(分钟)', type: 'number', min: 0, max: 300 },
  mood:          { label: '心情', type: 'select', options: ['好', '一般', '差'] },
  energy:        { label: '精力', type: 'select', options: ['充沛', '一般', '疲惫'] },
  systolic:      { label: '收缩压(mmHg)', type: 'number', min: 60, max: 250 },
  diastolic:     { label: '舒张压(mmHg)', type: 'number', min: 30, max: 150 },
  heart_rate:    { label: '心率(次/分)', type: 'number', min: 40, max: 200 },
  blood_glucose: { label: '空腹血糖(mmol/L)', type: 'number', min: 2, max: 20, step: 0.1 },
  spo2:          { label: '血氧(%)', type: 'number', min: 90, max: 100 },
  discomfort:    { label: '不适描述', type: 'text' },
  notes:         { label: '备注', type: 'text' },
  input_source:  { label: '录入来源', type: 'hidden' }, // manual / ai_text / ocr
  original_text: { label: '原话依据', type: 'hidden' }, // AI提取时的原文
};

const METRIC_CHART_FIELDS = [
  { key: 'sleep_hours',   label: '睡眠时长', unit: '小时',  color: '#14b8a6' },
  { key: 'activity_min',  label: '活动时长', unit: '分钟',  color: '#6366f1' },
  { key: 'systolic',      label: '收缩压',   unit: 'mmHg', color: '#ef4444' },
  { key: 'diastolic',     label: '舒张压',   unit: 'mmHg', color: '#f97316' },
  { key: 'heart_rate',    label: '心率',     unit: '次/分', color: '#8b5cf6' },
  { key: 'blood_glucose', label: '空腹血糖', unit: 'mmol/L', color: '#22c55e' },
  { key: 'spo2',          label: '血氧',     unit: '%',    color: '#0ea5e9' },
];

// ========== 本地日期工具（避免 toISOString 的 UTC 偏移） ==========
function localDateStr(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const TODAY_STR = localDateStr(0);

// ========== 演示数据 - 相对今天生成（近30天） ==========
// offset: 负数=过去天数，0=今天
// 关键场景：
//   off -5:  血压飙升146/92 + 头晕（近7天内，首页统计卡会告警）
//   off -3:  数据缺口
//   off -18: 血糖偏高 7.2 + 头痛
//   off -22: 血氧偏低 95% + 胸闷
//   off -27: 数据缺口
function buildDemoEntries() {
  return [
    // ========== 近14天（首页可见） ==========
    { off: 0,  sleep_hours: 7.1, activity_min: 35, systolic: 124, diastolic: 80, heart_rate: 73, blood_glucose: 5.5, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -1, sleep_hours: 7.8, activity_min: 40, systolic: 127, diastolic: 82, heart_rate: 76, blood_glucose: 5.9, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -2, sleep_hours: 6.9, activity_min: 28, systolic: 125, diastolic: 80, heart_rate: 74, blood_glucose: 5.6, spo2: 98, mood: '一般', energy: '一般', discomfort: '', notes: '' },
    { off: -3, sleep_hours: null, activity_min: null, systolic: null, diastolic: null, heart_rate: null, blood_glucose: null, spo2: null, mood: null, energy: null, discomfort: null, notes: '未测量' },
    { off: -4, sleep_hours: 7.2, activity_min: 30, systolic: 121, diastolic: 77, heart_rate: 71, blood_glucose: 5.2, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: 'OCR识别' },
    { off: -5, sleep_hours: 5.8, activity_min: 15, systolic: 146, diastolic: 92, heart_rate: 88, blood_glucose: 6.4, spo2: 97, mood: '差', energy: '疲惫', discomfort: '头有点晕', notes: '下午15:20补卡' },
    { off: -6, sleep_hours: 7.4, activity_min: 38, systolic: 123, diastolic: 78, heart_rate: 72, blood_glucose: 5.3, spo2: 99, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -7, sleep_hours: 7.1, activity_min: 25, systolic: 126, diastolic: 81, heart_rate: 74, blood_glucose: 5.5, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -8, sleep_hours: 7.3, activity_min: 32, systolic: 128, diastolic: 82, heart_rate: 75, blood_glucose: 5.7, spo2: 98, mood: '一般', energy: '一般', discomfort: '', notes: '' },
    { off: -9, sleep_hours: 7.0, activity_min: 28, systolic: 124, diastolic: 80, heart_rate: 73, blood_glucose: 5.5, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -10, sleep_hours: 7.0, activity_min: 35, systolic: 128, diastolic: 83, heart_rate: 76, blood_glucose: 5.8, spo2: 97, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -11, sleep_hours: 7.5, activity_min: 20, systolic: 123, diastolic: 79, heart_rate: 71, blood_glucose: 5.3, spo2: 99, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -12, sleep_hours: 6.8, activity_min: 30, systolic: 125, diastolic: 81, heart_rate: 74, blood_glucose: 5.6, spo2: 98, mood: '一般', energy: '一般', discomfort: '', notes: '' },
    { off: -13, sleep_hours: 7.2, activity_min: 25, systolic: 122, diastolic: 78, heart_rate: 72, blood_glucose: 5.4, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    // ========== 14~30天前（30天时段就诊卡可见） ==========
    { off: -14, sleep_hours: 7.0, activity_min: 32, systolic: 126, diastolic: 81, heart_rate: 74, blood_glucose: 5.5, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -15, sleep_hours: 6.5, activity_min: 22, systolic: 130, diastolic: 84, heart_rate: 78, blood_glucose: 6.0, spo2: 97, mood: '一般', energy: '一般', discomfort: '', notes: '' },
    { off: -16, sleep_hours: 7.6, activity_min: 40, systolic: 122, diastolic: 78, heart_rate: 70, blood_glucose: 5.2, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -17, sleep_hours: 6.8, activity_min: 25, systolic: 128, diastolic: 83, heart_rate: 76, blood_glucose: 5.8, spo2: 98, mood: '一般', energy: '一般', discomfort: '', notes: '' },
    { off: -18, sleep_hours: 5.5, activity_min: 10, systolic: 138, diastolic: 88, heart_rate: 85, blood_glucose: 7.2, spo2: 96, mood: '差', energy: '疲惫', discomfort: '头痛，恶心', notes: '血糖偏高' },
    { off: -19, sleep_hours: 7.2, activity_min: 28, systolic: 125, diastolic: 80, heart_rate: 73, blood_glucose: 5.6, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -20, sleep_hours: 7.5, activity_min: 35, systolic: 124, diastolic: 79, heart_rate: 72, blood_glucose: 5.4, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -21, sleep_hours: 7.0, activity_min: 30, systolic: 127, diastolic: 82, heart_rate: 75, blood_glucose: 5.7, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -22, sleep_hours: 6.0, activity_min: 15, systolic: 132, diastolic: 86, heart_rate: 82, blood_glucose: 5.9, spo2: 95, mood: '差', energy: '疲惫', discomfort: '胸闷，气短', notes: '血氧偏低' },
    { off: -23, sleep_hours: 7.3, activity_min: 28, systolic: 126, diastolic: 81, heart_rate: 74, blood_glucose: 5.5, spo2: 97, mood: '一般', energy: '一般', discomfort: '', notes: '' },
    { off: -24, sleep_hours: 7.8, activity_min: 42, systolic: 121, diastolic: 77, heart_rate: 70, blood_glucose: 5.1, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -25, sleep_hours: 7.1, activity_min: 30, systolic: 125, diastolic: 80, heart_rate: 73, blood_glucose: 5.4, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -26, sleep_hours: 6.9, activity_min: 25, systolic: 127, diastolic: 82, heart_rate: 75, blood_glucose: 5.6, spo2: 98, mood: '一般', energy: '一般', discomfort: '', notes: '' },
    { off: -27, sleep_hours: null, activity_min: null, systolic: null, diastolic: null, heart_rate: null, blood_glucose: null, spo2: null, mood: null, energy: null, discomfort: null, notes: '外出未测量' },
    { off: -28, sleep_hours: 7.4, activity_min: 38, systolic: 123, diastolic: 78, heart_rate: 72, blood_glucose: 5.3, spo2: 99, mood: '好', energy: '充沛', discomfort: '', notes: '' },
    { off: -29, sleep_hours: 7.0, activity_min: 30, systolic: 126, diastolic: 81, heart_rate: 74, blood_glucose: 5.5, spo2: 98, mood: '好', energy: '充沛', discomfort: '', notes: '' },
  ].map(e => ({
    date: localDateStr(e.off),
    sleep_hours: e.sleep_hours, activity_min: e.activity_min,
    systolic: e.systolic, diastolic: e.diastolic, heart_rate: e.heart_rate,
    blood_glucose: e.blood_glucose, spo2: e.spo2,
    mood: e.mood, energy: e.energy, discomfort: e.discomfort, notes: e.notes,
    input_source: 'demo', original_text: ''
  }));
}

// 服药计划演示数据
const DEMO_MEDS = [
  { id: 'm1', name: '降压药', dosage: '5mg', times: ['08:00', '20:00'], notes: '饭后服用', start_date: localDateStr(-29) },
  { id: 'm2', name: '阿司匹林', dosage: '100mg', times: ['08:00'], notes: '每日一次', start_date: localDateStr(-29) },
  { id: 'm3', name: '维生素D', dosage: '1000IU', times: ['12:00'], notes: '', start_date: localDateStr(-29) },
];

// 就诊卡演示数据（相对今天，覆盖30天）
const DEMO_VISIT_CARD = {
  id: 'vc_demo',
  created_at: TODAY_STR,
  period_start: localDateStr(-29),
  period_end: TODAY_STR,
  chief_complaint: '近一个月血压有波动，期间出现过146/92伴头晕，另有血糖偏高、血氧偏低的情况，希望全面评估并调整用药',
  medications: '降压药5mg早晚各一次；阿司匹林100mg每日；维生素D 1000IU',
  allergies: '青霉素过敏',
  questions: ['血压突然升高到146/92是什么原因？', '血糖7.2是否需要干预？', '血氧95%偏低需要做什么检查？', '目前用药方案是否需要调整？'],
};

// 转轮选项演示数据（菜品 & 餐馆）
const DEMO_WHEEL_OPTIONS = [
  // 菜品
  { id: 'w1',  name: '火锅',       emoji: '🍲', category: 'dish', enabled: true },
  { id: 'w2',  name: '烧烤',       emoji: '🍢', category: 'dish', enabled: true },
  { id: 'w3',  name: '寿司',       emoji: '🍣', category: 'dish', enabled: true },
  { id: 'w4',  name: '兰州拉面',   emoji: '🍜', category: 'dish', enabled: true },
  { id: 'w5',  name: '黄焖鸡米饭', emoji: '🍗', category: 'dish', enabled: true },
  { id: 'w6',  name: '麻辣香锅',   emoji: '🌶️', category: 'dish', enabled: true },
  { id: 'w11', name: '麻辣烫',     emoji: '🍲', category: 'dish', enabled: true },
  { id: 'w12', name: '盖浇饭',     emoji: '🍚', category: 'dish', enabled: true },
  { id: 'w13', name: '蛋炒饭',     emoji: '🍳', category: 'dish', enabled: true },
  { id: 'w14', name: '水饺',       emoji: '🥟', category: 'dish', enabled: true },
  { id: 'w15', name: '冒菜',       emoji: '🥘', category: 'dish', enabled: true },
  { id: 'w16', name: '煲仔饭',     emoji: '🍚', category: 'dish', enabled: true },
  { id: 'w17', name: '煎饼果子',   emoji: '🫓', category: 'dish', enabled: true },
  // 餐馆
  { id: 'w7',  name: '海底捞',     emoji: '🍲', category: 'restaurant', enabled: true },
  { id: 'w8',  name: '西贝莜面村', emoji: '🥟', category: 'restaurant', enabled: true },
  { id: 'w9',  name: '太二酸菜鱼', emoji: '🐟', category: 'restaurant', enabled: true },
  { id: 'w10', name: '麦当劳',     emoji: '🍔', category: 'restaurant', enabled: true },
  { id: 'w18', name: '肯德基',     emoji: '🍗', category: 'restaurant', enabled: true },
  { id: 'w19', name: '星巴克',     emoji: '☕', category: 'restaurant', enabled: true },
  { id: 'w20', name: '喜茶',       emoji: '🧋', category: 'restaurant', enabled: true },
  { id: 'w21', name: '真功夫',     emoji: '🍱', category: 'restaurant', enabled: true },
  { id: 'w22', name: '萨莉亚',     emoji: '🍕', category: 'restaurant', enabled: true },
  { id: 'w23', name: '和府捞面',   emoji: '🍜', category: 'restaurant', enabled: true },
];

// ========== 存储管理 ==========
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('loadDB error:', e);
    return null;
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function initDB() {
  let db = loadDB();
  if (!db) {
    db = {
      entries: buildDemoEntries(),
      medications: [...DEMO_MEDS],
      visit_card: { ...DEMO_VISIT_CARD },
      checkins: generateDemoCheckins(),
      ai_sessions: [],
      wheel_options: [...DEMO_WHEEL_OPTIONS],
      initialized_at: new Date().toISOString(),
    };
    saveDB(db);
  } else {
    // 演示数据刷新：若全部为演示数据且日期不是今天，重新生成相对今天的演示数据
    const allDemo = db.entries.length > 0 && db.entries.every(e => e.input_source === 'demo');
    const latestDate = db.entries[0]?.date;
    if (allDemo && latestDate !== TODAY_STR) {
      db.entries = buildDemoEntries();
      db.checkins = generateDemoCheckins();
      db.visit_card = { ...DEMO_VISIT_CARD };
      saveDB(db);
    }
    // 兼容老数据：缺失字段补默认
    if (!db.wheel_options) {
      db.wheel_options = [...DEMO_WHEEL_OPTIONS];
      saveDB(db);
    }
  }
  return db;
}

function generateDemoCheckins() {
  const checkins = [];
  const gapDates = [localDateStr(-3), localDateStr(-27)];       // 与演示数据缺口日一致
  const lateDates = [localDateStr(-5), localDateStr(-18)];      // 异常日服药迟服
  const pendingMedToday = true;
  const today = TODAY_STR;
  for (let off = -29; off <= 0; off++) {
    const dateStr = localDateStr(off);
    DEMO_MEDS.forEach((med, mi) => {
      const id = `ci_${dateStr}_${med.id}`;
      let status = 'done';
      if (gapDates.includes(dateStr)) status = 'missed';
      else if (lateDates.includes(dateStr) && mi === 0) status = 'late';
      else if (dateStr === today && mi === 0 && pendingMedToday) status = 'pending';
      med.times.forEach((t, ti) => {
        checkins.push({ id: `${id}_${ti}`, date: dateStr, med_id: med.id, time_slot: t, status });
      });
    });
  }
  return checkins;
}

// ========== CRUD 操作 ==========
function getAllEntries() {
  const db = initDB();
  return [...db.entries].sort((a, b) => b.date.localeCompare(a.date));
}

function getEntryByDate(date) {
  const db = initDB();
  return db.entries.find(e => e.date === date) || null;
}

function saveEntry(entry) {
  const db = initDB();
  const idx = db.entries.findIndex(e => e.date === entry.date);
  if (idx >= 0) {
    db.entries[idx] = { ...db.entries[idx], ...entry };
  } else {
    db.entries.push(entry);
  }
  saveDB(db);
}

function deleteEntry(date) {
  const db = initDB();
  db.entries = db.entries.filter(e => e.date !== date);
  saveDB(db);
}

function getEntriesInRange(startDate, endDate) {
  const db = initDB();
  return db.entries
    .filter(e => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ========== 统计辅助 ==========
function calcStats(values) {
  const valid = values.filter(v => v != null && v !== '' && !isNaN(v));
  if (valid.length === 0) return { mean: null, min: null, max: null, count: 0 };
  const sum = valid.reduce((a, b) => Number(a) + Number(b), 0);
  return {
    mean: +(sum / valid.length).toFixed(1),
    min: +Math.min(...valid),
    max: +Math.max(...valid),
    count: valid.length
  };
}

function getRecentEntries(days) {
  const startStr = localDateStr(-(days - 1));
  const endStr = TODAY_STR;
  return getEntriesInRange(startStr, endStr);
}

// ========== 数据导出 ==========
function exportData() {
  const db = initDB();
  return JSON.stringify(db, null, 2);
}

function resetAllData() {
  localStorage.removeItem(DB_KEY);
  return initDB();
}

// ========== 服药管理 CRUD ==========
function getMedications() {
  const db = initDB();
  return db.medications;
}

function saveMedication(med) {
  const db = initDB();
  if (med.id) {
    const idx = db.medications.findIndex(m => m.id === med.id);
    if (idx >= 0) db.medications[idx] = med;
  } else {
    med.id = 'm' + Date.now();
    db.medications.push(med);
  }
  saveDB(db);
}

function deleteMedication(id) {
  const db = initDB();
  db.medications = db.medications.filter(m => m.id !== id);
  saveDB(db);
}

function getCheckins() {
  const db = initDB();
  return db.checkins;
}

function toggleCheckin(id) {
  const db = initDB();
  const ci = db.checkins.find(c => c.id === id);
  if (ci) {
    ci.status = ci.status === 'done' ? 'missed' : 'done';
  } else {
    // 新建打卡记录
    db.checkins.push({ id, date: id.split('_')[1], med_id: id.split('_')[0], time_slot: id.split('_')[2] || '08:00', status: 'done' });
  }
  saveDB(db);
}

// ========== 就诊卡 ==========
function getVisitCard() {
  const db = initDB();
  return db.visit_card;
}

function saveVisitCard(card) {
  const db = initDB();
  db.visit_card = { ...db.visit_card, ...card, created_at: TODAY_STR };
  saveDB(db);
}

// ========== 会话 ==========
function getAISessions() {
  const db = initDB();
  return db.ai_sessions;
}
function addAIMessage(role, content) {
  const db = initDB();
  db.ai_sessions.push({ role, content, ts: Date.now() });
  saveDB(db);
}
function clearAISessions() {
  const db = initDB();
  db.ai_sessions = [];
  saveDB(db);
}

// ========== AI 云端配置（BYOK，仅存本地） ==========
const AI_CONFIG_KEY = 'jianji_ai_config';
function getAIConfig() {
  try {
    return JSON.parse(localStorage.getItem(AI_CONFIG_KEY)) || { base_url: '', api_key: '', model: '' };
  } catch { return { base_url: '', api_key: '', model: '' }; }
}
function saveAIConfig(cfg) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify({
    base_url: (cfg.base_url || '').trim().replace(/\/+$/, ''),
    api_key: (cfg.api_key || '').trim(),
    model: (cfg.model || '').trim(),
  }));
}
function clearAIConfig() {
  localStorage.removeItem(AI_CONFIG_KEY);
}
function isCloudAIReady() {
  const c = getAIConfig();
  return !!(c.base_url && c.api_key && c.model);
}

// ========== OCR 配置（仅存本地） ==========
const OCR_CONFIG_KEY = 'jianji_ocr_config';
function getOCRConfig() {
  try {
    return JSON.parse(localStorage.getItem(OCR_CONFIG_KEY)) || { provider: 'tesseract', baidu_api_key: '', baidu_secret_key: '' };
  } catch { return { provider: 'tesseract', baidu_api_key: '', baidu_secret_key: '' }; }
}
function saveOCRConfig(cfg) {
  const cur = getOCRConfig();
  localStorage.setItem(OCR_CONFIG_KEY, JSON.stringify({
    provider: cfg.provider || cur.provider,
    baidu_api_key: ((cfg.baidu_api_key ?? cur.baidu_api_key) || '').trim(),
    baidu_secret_key: ((cfg.baidu_secret_key ?? cur.baidu_secret_key) || '').trim(),
  }));
}
function clearOCRConfig() { localStorage.removeItem(OCR_CONFIG_KEY); }
function isBaiduOCRReady() {
  const c = getOCRConfig();
  return c.provider === 'baidu' && !!(c.baidu_api_key && c.baidu_secret_key);
}

// ========== 转轮选项 CRUD ==========
function getWheelOptions() {
  const db = initDB();
  return db.wheel_options || [];
}
function saveWheelOption(opt) {
  const db = initDB();
  if (!db.wheel_options) db.wheel_options = [];
  if (opt.id) {
    const idx = db.wheel_options.findIndex(o => o.id === opt.id);
    if (idx >= 0) db.wheel_options[idx] = { ...db.wheel_options[idx], ...opt };
  } else {
    opt.id = 'w' + Date.now();
    db.wheel_options.push(opt);
  }
  saveDB(db);
}
function deleteWheelOption(id) {
  const db = initDB();
  db.wheel_options = (db.wheel_options || []).filter(o => o.id !== id);
  saveDB(db);
}
function toggleWheelOption(id) {
  const db = initDB();
  const opt = db.wheel_options?.find(o => o.id === id);
  if (opt) { opt.enabled = !opt.enabled; saveDB(db); }
}
function resetWheelOptions() {
  const db = initDB();
  db.wheel_options = [...DEMO_WHEEL_OPTIONS];
  saveDB(db);
}

// 导出到全局
window.JJData = {
  DB_KEY, HEALTH_FIELDS, METRIC_CHART_FIELDS,
  localDateStr, TODAY_STR,
  initDB, getAllEntries, getEntryByDate, saveEntry, deleteEntry,
  getEntriesInRange, getRecentEntries, calcStats,
  exportData, resetAllData,
  getMedications, saveMedication, deleteMedication,
  getCheckins, toggleCheckin,
  getVisitCard, saveVisitCard,
  getAISessions, addAIMessage, clearAISessions,
  getAIConfig, saveAIConfig, clearAIConfig, isCloudAIReady,
  getOCRConfig, saveOCRConfig, clearOCRConfig, isBaiduOCRReady,
  getWheelOptions, saveWheelOption, deleteWheelOption, toggleWheelOption, resetWheelOptions,
};
