const fs = require('fs');
const path = require('path');

class CanonValidator {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.rules = [
      {
        name: '章尾完结结语禁令',
        category: '排版纪律',
        check: (text) => /（全章完）|（本章完）|（本章终）|\(全章完\)|\(本章完\)/.test(text),
        desc: '严禁在章节末尾加（全章完）/（本章完）等结语标记，自然收尾即可。'
      },
      {
        name: '说教古言词禁令',
        category: '文风规范',
        check: (text) => /(这般|那般|莫要|何故|莫不是)/.test(text),
        desc: '全篇严禁出现说教感古言词“这般”、“那般”、“莫要”、“何故”、“莫不是”，需用白话。'
      },
      {
        name: '公式化转折句式禁令',
        category: '去AI味',
        check: (text) => /不是[^，。！？\n]{0,12}而是/.test(text) || /不只是[^，。！？\n]{0,12}更是/.test(text),
        desc: '严禁使用「不是……而是……」或「不只是……更是……」公式化转折句式。'
      },
      {
        name: '现代概念词汇入侵',
        category: '去AI味',
        check: (text) => /(本质上|逻辑上|情绪价值|降维打击|底层逻辑|某种程度上)/.test(text),
        desc: '严禁出现现代学术/互联网黑话，保持纯正故事语境。'
      }
    ];
  }

  addCustomRule(rule) {
    this.rules.push(rule);
  }

  validateFile(filePath) {
    if (!fs.existsSync(filePath)) return { valid: true, errors: [] };
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];

    this.rules.forEach(rule => {
      if (rule.check(content)) {
        errors.push({
          ruleName: rule.name,
          category: rule.category,
          desc: rule.desc
        });
      }
    });

    return {
      filePath: path.relative(this.rootDir, filePath).replace(/\\/g, '/'),
      valid: errors.length === 0,
      errors
    };
  }

  validateAllZhengwen(targetDir = '正文') {
    const zhengwenDir = path.join(this.rootDir, targetDir);
    const report = [];

    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          walk(full);
        } else if (f.endsWith('.md')) {
          const res = this.validateFile(full);
          if (!res.valid) {
            report.push(res);
          }
        }
      });
    };

    walk(zhengwenDir);
    return report;
  }
}

module.exports = CanonValidator;
