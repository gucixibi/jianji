/**
 * 健迹 - AI 文字提取（本地规则引擎）
 * 对应设计文档 3.2 节"本地规则提取"通道
 * 不联网、文字不出本机，安全性更高
 */

const JJAI = {
  // 从自然语言中提取结构化字段
  extract(text) {
    const result = {
      date: null,
      date_confidence: 0,
      fields: {},
      evidence: {},
      original_text: text
    };

    if (!text || text.trim().length === 0) return result;
    const t = text.trim();

    // 1. 日期提取
    result.date = this.extractDate(t);

    // 2. 睡眠时长 - "睡了7.5小时" / "睡眠7小时" / "睡7.5h"
    const sleepMatch = t.match(/(?:睡(?:了|眠)?|sleep)[约]?\s*(\d+(?:\.\d+)?)\s*(?:小?时|h)/i);
    if (sleepMatch) {
      result.fields.sleep_hours = parseFloat(sleepMatch[1]);
      result.evidence.sleep_hours = sleepMatch[0];
    }

    // 3. 活动时长 - "散步30分钟" / "运动40min" / "走路25分钟"
    const activityMatch = t.match(/(?:散步|走路|跑步|运动|活动|锻炼)[约]?\s*(\d+)\s*(?:分钟|min)/i);
    if (activityMatch) {
      result.fields.activity_min = parseInt(activityMatch[1]);
      result.evidence.activity_min = activityMatch[0];
    }

    // 4. 血压 - "血压120/80" / "120/80"
    const bpMatch = t.match(/(?:血压[约]?\s*)?(\d{2,3})\s*[\/或至]\s*(\d{2,3})(?:\s*(?:mmHg)?)?/i);
    if (bpMatch) {
      result.fields.systolic = parseInt(bpMatch[1]);
      result.fields.diastolic = parseInt(bpMatch[2]);
      result.evidence.systolic = bpMatch[0];
      result.evidence.diastolic = bpMatch[0];
    }

    // 5. 心率 - "心率72" / "心跳72"
    const hrMatch = t.match(/(?:心率|心跳)[约]?\s*(\d{2,3})\s*(?:次[\/每]分|bpm|每分钟)?/i);
    if (hrMatch) {
      result.fields.heart_rate = parseInt(hrMatch[1]);
      result.evidence.heart_rate = hrMatch[0];
    }

    // 6. 血糖 - "血糖5.6" / "空腹血糖5.6"
    const gluMatch = t.match(/(?:空腹)?\s*血糖[约]?\s*(\d+\.\d+|\d+)\s*(?:mmol\/?L|毫摩尔)?/i);
    if (gluMatch) {
      result.fields.blood_glucose = parseFloat(gluMatch[1]);
      result.evidence.blood_glucose = gluMatch[0];
    }

    // 7. 血氧 - "血氧98" / "血氧98%"
    const spo2Match = t.match(/(?:血氧|SpO[2₂])[约]?\s*(\d{2,3})\s*%?/i);
    if (spo2Match && parseInt(spo2Match[1]) >= 90 && parseInt(spo2Match[1]) <= 100) {
      result.fields.spo2 = parseInt(spo2Match[1]);
      result.evidence.spo2 = spo2Match[0];
    }

    // 8. 心情 - "心情好/一般/差" / "感觉不错"
    if (/心情[好棒不错愉快]/.test(t)) {
      result.fields.mood = '好';
      result.evidence.mood = t.match(/心情[好棒不错愉快]+/)?.[0] || '';
    } else if (/心情[差糟难过低落郁闷]/.test(t) || /感觉[疲惫累差]/.test(t)) {
      result.fields.mood = '差';
      result.evidence.mood = t.match(/心情[差糟难过低落郁闷]+|感觉[疲惫累差]+/)?.[0] || '';
    }

    // 9. 不适描述 - "头晕" / "有点不舒服"
    const discomfortKeywords = ['头晕', '头痛', '恶心', '胸闷', '心慌', '咳嗽', '疼', '胀', '不舒服', '不适', '乏力', '疲惫'];
    for (const kw of discomfortKeywords) {
      if (t.includes(kw)) {
        // 提取关键词附近的描述
        const idx = t.indexOf(kw);
        const start = Math.max(0, idx - 6);
        const end = Math.min(t.length, idx + 10);
        result.fields.discomfort = t.slice(start, end).replace(/[，。,.;；]/g, '');
        result.evidence.discomfort = t.slice(start, end);
        break;
      }
    }

    // 设置日期
    if (result.date) {
      result.fields.date = result.date;
    } else {
      // 默认今天
      result.date = JJData.TODAY_STR;
      result.fields.date = result.date;
      result.evidence.date = '(未识别日期，默认今天)';
    }

    return result;
  },

  // 日期提取
  extractDate(text) {
    // 1. 完整日期 2026-10-09 / 2026/10/9 / 2026年10月9日
    const fullMatch = text.match(/(20\d{2})[-\/年.](\d{1,2})[-\/月.](\d{1,2})/);
    if (fullMatch) {
      return `${fullMatch[1]}-${fullMatch[2].padStart(2,'0')}-${fullMatch[3].padStart(2,'0')}`;
    }

    // 2. 简化日期 10月9日 / 10-9 / 10/9
    const shortMatch = text.match(/(?:^|[^\d])(\d{1,2})[月\-\/](\d{1,2})(?:日|号)?/);
    if (shortMatch) {
      const year = new Date().getFullYear();
      return `${year}-${shortMatch[1].padStart(2,'0')}-${shortMatch[2].padStart(2,'0')}`;
    }

    // 3. "今天" / "昨天" / "前天"
    if (/今天|今日/.test(text)) return JJData.TODAY_STR;
    if (/昨天|昨日/.test(text)) return JJData.localDateStr(-1);
    if (/前天/.test(text)) return JJData.localDateStr(-2);

    return null;
  },

  // 根据已有记录生成观察草稿（趋势回顾中的 AI 辅助观察）
  generateObservation(entries, metricKey) {
    if (!entries || entries.length < 2) return null;

    const valid = entries.filter(e => e[metricKey] != null && e[metricKey] !== '');
    if (valid.length < 2) return null;

    const sorted = valid.sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const diff = Number(last[metricKey]) - Number(first[metricKey]);

    // 找最高/最低
    let max = sorted[0], min = sorted[0];
    sorted.forEach(e => {
      if (Number(e[metricKey]) > Number(max[metricKey])) max = e;
      if (Number(e[metricKey]) < Number(min[metricKey])) min = e;
    });

    return {
      summary: `共 ${sorted.length} 条有效记录，${sorted[0].date} ${Number(first[metricKey])} → ${sorted[sorted.length-1].date} ${Number(last[metricKey])}（${diff > 0 ? '+' : ''}${diff}）。`,
      peaks: `最高 ${Number(max[metricKey])}（${max.date}），最低 ${Number(min[metricKey])}（${min.date}）。`,
      gaps: entries.length - valid.length > 0 ? `缺失 ${entries.length - valid.length} 天数据。` : '无缺失。',
      disclaimer: '以上为本地规则观察，仅引述数据事实，不做因果推断或医学判断。'
    };
  },

  // 辅助生成就诊时间线文字描述
  generateTimelineText(entries) {
    if (!entries || entries.length === 0) return '（暂无记录）';
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const lines = sorted.map(e => {
      const parts = [`${e.date}`];
      if (e.systolic) parts.push(`${e.systolic}/${e.diastolic}mmHg`);
      if (e.heart_rate) parts.push(`心率${e.heart_rate}`);
      if (e.sleep_hours) parts.push(`睡${e.sleep_hours}h`);
      if (e.discomfort) parts.push(`「${e.discomfort}」`);
      return parts.join('，');
    });
    return lines.join('\n');
  }
};

window.JJAI = JJAI;
