const fs = require('fs');
const path = require('path');

class NarrativeMemoryEngine {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.fubiPath = path.join(rootDir, '伏笔', '伏笔.md');
    this.timelinePath = path.join(rootDir, '小结', '时间线.md');
    this.roleDir = path.join(rootDir, '角色档案');
    this.summaryDir = path.join(rootDir, '小结');
    this.loreDirs = [
      path.join(rootDir, '设定'),
      path.join(rootDir, '世界观'),
      path.join(rootDir, '地点')
    ];
  }

  parseSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = { title: '概述', level: 1, content: [] };

    lines.forEach(line => {
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        if (currentSection.content.length > 0 || currentSection.title !== '概述') {
          sections.push({
            title: currentSection.title,
            level: currentSection.level,
            text: currentSection.content.join('\n').trim()
          });
        }
        currentSection = {
          title: headerMatch[2].trim(),
          level: headerMatch[1].length,
          content: []
        };
      } else {
        currentSection.content.push(line);
      }
    });

    if (currentSection.content.length > 0 || currentSection.title !== '概述') {
      sections.push({
        title: currentSection.title,
        level: currentSection.level,
        text: currentSection.content.join('\n').trim()
      });
    }

    return sections;
  }

  query(keywords = []) {
    const rawKeywords = Array.isArray(keywords) ? keywords : [keywords];
    const results = {
      entities: [],
      events: [],
      foreshadowing: [],
      lore: [],
      emotions: [],
      timeline: []
    };

    if (rawKeywords.length === 0) return results;

    // 1. 角色与实体
    if (fs.existsSync(this.roleDir)) {
      fs.readdirSync(this.roleDir).forEach(file => {
        if (!file.endsWith('.md')) return;
        const filePath = path.join(this.roleDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const charName = file.replace('.md', '');
        const matched = rawKeywords.some(kw => charName.includes(kw) || content.includes(kw));

        if (matched) {
          const sections = this.parseSections(content);
          sections.forEach(sec => {
            if (rawKeywords.some(kw => sec.title.includes(kw) || sec.text.includes(kw))) {
              if (sec.title.includes('性格') || sec.title.includes('情感') || sec.title.includes('心理')) {
                results.emotions.push({ character: charName, title: sec.title, text: sec.text });
              } else {
                results.entities.push({ character: charName, title: sec.title, text: sec.text });
              }
            }
          });
        }
      });
    }

    // 2. 伏笔
    if (fs.existsSync(this.fubiPath)) {
      const content = fs.readFileSync(this.fubiPath, 'utf8');
      const blocks = content.split(/### \d+\.\s+/).slice(1);
      blocks.forEach((block, idx) => {
        if (rawKeywords.some(kw => block.includes(kw))) {
          const titleMatch = block.match(/^(.*?)\n/);
          const statusMatch = block.match(/\*\*状态\*\*：(.*?)\n/);
          results.foreshadowing.push({
            id: idx + 1,
            title: titleMatch ? titleMatch[1].trim() : `伏笔 ${idx + 1}`,
            status: statusMatch ? statusMatch[1].trim() : '未回收',
            detail: block.substring(0, 300).trim()
          });
        }
      });
    }

    return results;
  }
}

module.exports = NarrativeMemoryEngine;
