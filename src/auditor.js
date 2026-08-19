/**
 * 写后质量审计引擎 (Post-Write Narrative Quality Auditor)
 * 
 * 融合架构：
 * - Webnovel-Writer (8 维度扣分制雷达与度量指标)
 * - Dramatica-Flow (PostWriteValidator, 疲劳词密度, 连续虚词检测)
 * - Inkos (确定性硬规则与阻断级校验)
 */

const fs = require('fs');
const path = require('path');

const SCORE_CATEGORIES = {
  ai_flavor: { name: '去AI味/文风纯净度', weight: 1.2 },
  character: { name: '角色塑造/人设一致性', weight: 1.2 },
  continuity: { name: '叙事连续性/上下文衔接', weight: 1.0 },
  setting: { name: '世界观/战力境界硬设定', weight: 1.0 },
  pacing: { name: '节奏控制/段落韵律', weight: 0.8 },
  logic: { name: '因果逻辑/信息边界', weight: 1.0 },
  timeline: { name: '时间线与空间坐标', weight: 0.8 },
  other: { name: '格式与排版规范', weight: 0.6 }
};

const SEVERITY_PENALTIES = {
  critical: 25.0,
  high: 12.0,
  medium: 5.0,
  low: 2.0
};

const FORBIDDEN_PATTERNS = [
  { name: '公式化转折·不是而是', regex: /不是[^，。！？\n]{0,12}而是/g, category: 'ai_flavor', severity: 'critical', msg: '严禁使用「不是……而是……」公式化转折' },
  { name: '公式化转折·不是是', regex: /不是[^，。！？\n]{0,12}，[^，。！？\n]{0,8}是/g, category: 'ai_flavor', severity: 'critical', msg: '严禁使用「不是……，是……」' },
  { name: '公式化转折·不只是更是', regex: /不只是[^，。！？\n]{0,12}更是/g, category: 'ai_flavor', severity: 'critical', msg: '严禁使用「不只是……更是……」' },
  { name: '公式化转折·不像更像', regex: /不像[^，。！？\n]{0,12}更像/g, category: 'ai_flavor', severity: 'critical', msg: '严禁使用「不像……更像……」' },
  { name: '章尾完结结语', regex: /（全章完）|（本章完）|（本章终）|\(全章完\)|\(本章完\)/g, category: 'other', severity: 'critical', msg: '严禁在章节末尾加（全章完）等结语标记' },
  { name: '现代说明腔', regex: /(本质上|逻辑上|情绪价值|拉满|某种程度上|底层逻辑|降维打击)/g, category: 'ai_flavor', severity: 'critical', msg: '现代说明腔/学术词汇破坏叙事古典语境' },
  { name: '卖关子旁白', regex: /(他不知道的是|她不知道的是|他们不知道的是|没人知道的是)/g, category: 'logic', severity: 'high', msg: '严禁全知视角生硬卖关子' },
  { name: '升华说书套话', regex: /(命运的齿轮|这一刻，.*终于|某种意义上|归根结底|这只是个开始|这只是开始)/g, category: 'ai_flavor', severity: 'critical', msg: '严禁出现假大空升华或说书人总结套话' },
  { name: '网文浮夸套词', regex: /(逆天|打脸|秒杀|气势惊人|强悍无比|惊为天人)/g, category: 'ai_flavor', severity: 'high', msg: '严禁使用粗俗网文套词' }
];

const META_NARRATIVE_PATTERNS = [
  { name: '作者说教', regex: /(显然[，,。]|毫无疑问|不言而喻|不得不说)/g, category: 'ai_flavor', severity: 'high', msg: '作者跳出故事直接给读者下结论' },
  { name: '元叙事词汇', regex: /(核心动机|信息落差|叙事节奏|情节推进|人物弧线)/g, category: 'logic', severity: 'critical', msg: '正文中出现编剧/分析术语' },
  { name: '作者解读动作', regex: /(像在确认|像在试探|像在说|像是确认|像是试探|像是说)/g, category: 'character', severity: 'medium', msg: '作者越俎代庖替读者解读动作心理' },
  { name: '模糊万能词', regex: /(说不清|某种莫名|某种难以言喻|某种说不清)/g, category: 'ai_flavor', severity: 'medium', msg: '模糊万能描写偷懒' },
  { name: '集体反应套话', regex: /(在场众人|全场所有人|众人齐声|异口同声|一时间.*(哗然|震动|沸腾))/g, category: 'pacing', severity: 'medium', msg: '集体群像反应套路化' }
];

const DENSITY_MARKERS = [
  { word: '仿佛', maxPer3k: 1, category: 'ai_flavor', label: '疲劳比喻词' },
  { word: '宛如', maxPer3k: 1, category: 'ai_flavor', label: '疲劳比喻词' },
  { word: '犹如', maxPer3k: 1, category: 'ai_flavor', label: '疲劳比喻词' },
  { word: '猛地', maxPer3k: 1, category: 'pacing', label: '动作突变标记' },
  { word: '蓦地', maxPer3k: 1, category: 'pacing', label: '动作突变标记' },
  { word: '蓦然', maxPer3k: 1, category: 'pacing', label: '动作突变标记' },
  { word: '忽然', maxPer3k: 2, category: 'pacing', label: '突变标记' },
  { word: '忽地', maxPer3k: 1, category: 'pacing', label: '突变标记' },
  { word: '竟然', maxPer3k: 1, category: 'ai_flavor', label: '情绪副词' },
  { word: '不禁', maxPer3k: 1, category: 'ai_flavor', label: '情绪副词' },
  { word: '顿时', maxPer3k: 1, category: 'pacing', label: '突变标记' },
  { word: '不由得', maxPer3k: 1, category: 'ai_flavor', label: '情绪副词' },
  { word: '似乎', maxPer3k: 2, category: 'ai_flavor', label: '模糊标记' },
  { word: '下意识', maxPer3k: 1, category: 'ai_flavor', label: 'AI无意识动作' },
  { word: '不由自主', maxPer3k: 1, category: 'ai_flavor', label: 'AI无意识动作' },
  { word: '稳稳', maxPer3k: 1, category: 'ai_flavor', label: '高频字' },
  { word: '深吸一口气', maxPer3k: 1, category: 'character', label: '高频套路动作' }
];

const ARCHAIC_PREACHY_WORDS = [
  { word: '这般', replace: '这么 / 这样' },
  { word: '那般', replace: '那样' },
  { word: '莫要', replace: '不要 / 别' },
  { word: '何故', replace: '为什么 / 因何' },
  { word: '莫不是', replace: '莫非 / 难道' }
];

class NarrativeAuditor {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
  }

  auditText(content, fileName = '未知章节') {
    const issues = [];
    const stats = {
      charCount: content.replace(/\s+/g, '').length,
      rawLength: content.length,
      paragraphCount: 0,
      dashCount: 0,
      consecutiveLeMax: 0,
      longParagraphs: 0
    };

    const charCount = stats.charCount;

    FORBIDDEN_PATTERNS.forEach(rule => {
      let match;
      const regex = new RegExp(rule.regex);
      while ((match = regex.exec(content)) !== null) {
        const lineNo = content.substring(0, match.index).split('\n').length;
        issues.push({
          severity: rule.severity,
          category: rule.category,
          rule: rule.name,
          line: lineNo,
          excerpt: match[0],
          description: rule.msg,
          blocking: rule.severity === 'critical'
        });
      }
    });

    META_NARRATIVE_PATTERNS.forEach(rule => {
      let match;
      const regex = new RegExp(rule.regex);
      while ((match = regex.exec(content)) !== null) {
        const lineNo = content.substring(0, match.index).split('\n').length;
        issues.push({
          severity: rule.severity,
          category: rule.category,
          rule: rule.name,
          line: lineNo,
          excerpt: match[0],
          description: rule.msg,
          blocking: rule.severity === 'critical'
        });
      }
    });

    ARCHAIC_PREACHY_WORDS.forEach(item => {
      const regex = new RegExp(item.word, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNo = content.substring(0, match.index).split('\n').length;
        issues.push({
          severity: 'medium',
          category: 'ai_flavor',
          rule: `说教古言词·${item.word}`,
          line: lineNo,
          excerpt: item.word,
          description: `建议改为白话自然表达（如：${item.replace}）`,
          blocking: false
        });
      }
    });

    DENSITY_MARKERS.forEach(marker => {
      const regex = new RegExp(marker.word, 'g');
      const matches = content.match(regex);
      const count = matches ? matches.length : 0;
      if (count > 0 && charCount > 0) {
        const per3k = (count / charCount) * 3000;
        if (per3k > marker.maxPer3k) {
          issues.push({
            severity: per3k > marker.maxPer3k * 2 ? 'high' : 'medium',
            category: marker.category,
            rule: `高频疲劳词·${marker.word}`,
            line: '-',
            excerpt: `${marker.word} (出现 ${count} 次 / 每3k字 ${per3k.toFixed(1)} 次)`,
            description: `「${marker.word}」密度超标，建议上限每3000字 ${marker.maxPer3k} 次`,
            blocking: false
          });
        }
      }
    });

    const sentences = content.split(/[。！？!?\n]/).map(s => s.trim()).filter(s => s.length > 0);
    let consecutiveLe = 0;
    let maxLe = 0;
    sentences.forEach(s => {
      if (s.endsWith('了') || /了[，,]/.test(s)) {
        consecutiveLe++;
        if (consecutiveLe > maxLe) maxLe = consecutiveLe;
      } else {
        consecutiveLe = 0;
      }
    });
    stats.consecutiveLeMax = maxLe;
    if (maxLe >= 5) {
      issues.push({
        severity: 'medium',
        category: 'pacing',
        rule: '连续虚词句式',
        line: '-',
        excerpt: `连续 ${maxLe} 句带「了」`,
        description: `连续 ${maxLe} 句以「了」结尾，节奏单调，建议精简句末虚词`,
        blocking: false
      });
    }

    const paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    stats.paragraphCount = paragraphs.length;
    let longPCount = 0;
    paragraphs.forEach(p => {
      if (p.length > 350) longPCount++;
    });
    stats.longParagraphs = longPCount;
    if (longPCount >= 2) {
      issues.push({
        severity: 'low',
        category: 'pacing',
        rule: '段落篇幅过长',
        line: '-',
        excerpt: `${longPCount} 个段落 > 350 字`,
        description: `存在 ${longPCount} 个超长大段落，建议按呼吸感适度拆分`,
        blocking: false
      });
    }

    const dashMatches = content.match(/——/g);
    stats.dashCount = dashMatches ? dashMatches.length : 0;
    if (stats.dashCount > 8) {
      issues.push({
        severity: 'low',
        category: 'pacing',
        rule: '破折号密度偏高',
        line: '-',
        excerpt: `破折号出现 ${stats.dashCount} 处`,
        description: `破折号较多，注意避免用于生硬转折或刻意升华`,
        blocking: false
      });
    }

    const dimensionScores = {};
    Object.keys(SCORE_CATEGORIES).forEach(cat => {
      dimensionScores[cat] = 100.0;
    });

    let totalPenalty = 0;
    issues.forEach(issue => {
      const penalty = SEVERITY_PENALTIES[issue.severity] || 5.0;
      const cat = issue.category || 'other';
      dimensionScores[cat] = Math.max(0, parseFloat((dimensionScores[cat] - penalty).toFixed(1)));
      totalPenalty += penalty;
    });

    const overallScore = Math.max(0, parseFloat((100.0 - totalPenalty).toFixed(1)));
    const blockingCount = issues.filter(i => i.blocking).length;

    return {
      file: fileName,
      charCount,
      overallScore,
      dimensionScores,
      stats,
      issues,
      issuesCount: issues.length,
      blockingCount,
      hasBlocking: blockingCount > 0,
      passed: blockingCount === 0 && overallScore >= 75.0
    };
  }

  auditFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return { file: filePath, exists: false, error: '文件不存在' };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const result = this.auditText(content, path.basename(filePath));
    result.relPath = path.relative(this.rootDir, filePath).replace(/\\/g, '/');
    return result;
  }

  findLatestChapter() {
    const zhengwenDir = path.join(this.rootDir, '正文');
    if (!fs.existsSync(zhengwenDir)) return null;
    let latestFile = null;
    let latestMtime = 0;

    const walk = (dir) => {
      fs.readdirSync(dir).forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full);
        else if (file.endsWith('.md')) {
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
            latestFile = full;
          }
        }
      });
    };
    walk(zhengwenDir);
    return latestFile;
  }

  printReport(result) {
    console.log('\n======================================================================');
    console.log(`📄 审计目标: ${result.relPath || result.file}`);
    console.log(`🎯 综合评分: ${result.overallScore} / 100 ｜ 状态: ${result.passed ? '✅ 准予入库' : '❌ 阻断需修'}`);
    console.log(`📊 篇幅统计: ${result.charCount} 字 ｜ 段落数: ${result.stats.paragraphCount} ｜ 破折号: ${result.stats.dashCount} ｜ 连"了"最大值: ${result.stats.consecutiveLeMax}`);
    console.log('----------------------------------------------------------------------');
    
    const dimStrs = Object.keys(SCORE_CATEGORIES).map(cat => {
      return `${SCORE_CATEGORIES[cat].name.split('/')[0]}: ${result.dimensionScores[cat]}分`;
    });
    console.log(`📈 维度评分: ${dimStrs.join(' | ')}`);
    console.log('----------------------------------------------------------------------');

    if (result.issues.length === 0) {
      console.log('✨ 【完美状态】零违禁句式、零超标疲劳词、设定逻辑严密！');
      console.log('======================================================================\n');
      return;
    }

    const criticals = result.issues.filter(i => i.severity === 'critical');
    const highs = result.issues.filter(i => i.severity === 'high');
    const mediums = result.issues.filter(i => i.severity === 'medium');
    const lows = result.issues.filter(i => i.severity === 'low');

    if (criticals.length > 0) {
      console.log(`\n🚫 【CRITICAL 阻断级错误】(${criticals.length} 处):`);
      criticals.forEach((c, idx) => {
        console.log(`  ${idx + 1}. [${c.rule}] 行:${c.line} -> "${c.excerpt}"`);
        console.log(`     └─ 原因: ${c.description}`);
      });
    }

    if (highs.length > 0) {
      console.log(`\n⚠️  【HIGH 高风险预警】(${highs.length} 处):`);
      highs.forEach((h, idx) => {
        console.log(`  ${idx + 1}. [${h.rule}] 行:${h.line} -> "${h.excerpt}"`);
        console.log(`     └─ 原因: ${h.description}`);
      });
    }

    if (mediums.length > 0) {
      console.log(`\n🟡 【MEDIUM 疲劳词/节奏建议】(${mediums.length} 处):`);
      mediums.forEach((m, idx) => {
        console.log(`  ${idx + 1}. [${m.rule}] ${m.line !== '-' ? `行:${m.line}` : '全局'} -> "${m.excerpt}"`);
        console.log(`     └─ 提示: ${m.description}`);
      });
    }

    if (lows.length > 0) {
      console.log(`\n💡 【LOW 排版微调】(${lows.length} 处):`);
      lows.forEach((l, idx) => {
        console.log(`  ${idx + 1}. [${l.rule}] -> ${l.excerpt} (${l.description})`);
      });
    }

    console.log('\n======================================================================\n');
  }
}

module.exports = NarrativeAuditor;
