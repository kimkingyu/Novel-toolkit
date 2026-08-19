/**
 * 情绪波浪与高潮节奏走势分析器 (Narrative Wave Analyzer)
 */

const fs = require('fs');
const path = require('path');

class NarrativeWaveAnalyzer {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.zhengwenDir = path.join(rootDir, '正文');
  }

  calculateConflictScore(content) {
    if (!content) return 0;
    const len = content.length;
    if (len === 0) return 0;

    const conflictMatches = content.match(/(剑|斩|杀|打|轰|爆|死|战|闯|压|血|伤|敌|魔|破|截|袭|拼|崩|重|危险|绝|强|咆哮|急|狂)/g) || [];
    const exclamations = content.match(/！/g) || [];

    const baseScore = (conflictMatches.length / len) * 1000;
    const punctScore = (exclamations.length / len) * 1000 * 1.5;

    return parseFloat((baseScore + punctScore).toFixed(2));
  }

  getAllChapters() {
    if (!fs.existsSync(this.zhengwenDir)) return [];
    const chapters = [];

    const walk = (dir) => {
      fs.readdirSync(dir).forEach(file => {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (file.endsWith('.md')) {
          const content = fs.readFileSync(full, 'utf8');
          const titleMatch = content.match(/^#\s+(.*?)$/m);
          const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
          const chapMatch = file.match(/第(\d+)章/);
          const chapNum = chapMatch ? parseInt(chapMatch[1], 10) : 0;
          const stat = fs.statSync(full);

          chapters.push({
            file,
            fullPath: full,
            title,
            num: chapNum,
            length: content.length,
            mtime: stat.mtimeMs,
            conflictScore: this.calculateConflictScore(content)
          });
        }
      });
    };

    walk(this.zhengwenDir);
    chapters.sort((a, b) => a.mtime - b.mtime);
    return chapters;
  }

  analyzeRecentChapters(limit = 8) {
    const chapters = this.getAllChapters();
    return chapters.slice(-limit);
  }

  generateReport(limit = 8) {
    const recent = this.analyzeRecentChapters(limit);
    if (recent.length === 0) return '暂无正文章节数据。';

    let total = 0;
    recent.forEach(c => total += c.conflictScore);
    const avg = (total / recent.length).toFixed(2);
    const last = recent[recent.length - 1];

    let output = `【最新 ${recent.length} 章节奏波浪指数 (均值: ${avg})】\n`;
    recent.forEach(c => {
      const barLen = Math.min(25, Math.round(c.conflictScore / 2));
      const bar = '█'.repeat(barLen) + '░'.repeat(25 - barLen);
      output += `  第${c.num.toString().padStart(2, ' ')}章: [${bar}] ${c.conflictScore.toFixed(1).padStart(5, ' ')}分 ｜ ${c.title}\n`;
    });

    const isCooling = last.conflictScore < avg;
    output += `\n💡 节奏建议: 最新章 [${last.title}] 冲突分为 ${last.conflictScore}。\n`;
    output += isCooling
      ? '   👉 当前处于情绪沉淀/疗愈舒缓期，适合细腻刻画人物心境、人际升温或铺展暗线伏笔。'
      : '   👉 当前剧情处于升温高潮期，建议强化危机紧迫感与动作碰撞！';

    return output;
  }
}

module.exports = NarrativeWaveAnalyzer;
