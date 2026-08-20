const fs = require('fs');
const path = require('path');
const NarrativeMemoryEngine = require('./memory_engine');

class ContextAssembler {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.memoryEngine = new NarrativeMemoryEngine(rootDir);
  }

  findLatestOutline() {
    const zhanggangDir = path.join(this.rootDir, '章纲');
    if (!fs.existsSync(zhanggangDir)) return null;
    let latestFile = null;
    let latestMtime = 0;
    fs.readdirSync(zhanggangDir).forEach(f => {
      if (f.endsWith('.md')) {
        const full = path.join(zhanggangDir, f);
        const stat = fs.statSync(full);
        if (stat.mtimeMs > latestMtime) {
          latestMtime = stat.mtimeMs;
          latestFile = full;
        }
      }
    });
    return latestFile;
  }

  findPreviousChapterEnd(outlineTitle) {
    const match = outlineTitle.match(/第(\d+)章/);
    if (!match) return '（需手动核对上一章结尾衔接）';
    const currentNum = parseInt(match[1], 10);
    const prevNum = currentNum - 1;
    if (prevNum <= 0) return '（卷首/篇首章节，独立起势）';

    const zhengwenDir = path.join(this.rootDir, '正文');
    let prevContent = null;

    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach(file => {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (file.endsWith('.md')) {
          if (file.includes(`第${prevNum}章`) || file.includes(`第${prevNum}章·`)) {
            prevContent = fs.readFileSync(full, 'utf8');
          }
        }
      });
    };
    walk(zhengwenDir);

    if (!prevContent) return '（未检索到上一章正文文件，请注意时空承接）';

    const paras = prevContent.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    const last3 = paras.slice(-3).join('\n\n');
    return last3;
  }

  assembleBrief(outlinePath) {
    if (!fs.existsSync(outlinePath)) {
      return { error: `未找到章纲文件: ${outlinePath}` };
    }

    const outlineContent = fs.readFileSync(outlinePath, 'utf8');
    const outlineFileName = path.basename(outlinePath, '.md');

    const titleMatch = outlineContent.match(/^#\s+(.*?)$/m);
    const chapterHeading = titleMatch ? titleMatch[1] : outlineFileName;
    
    const prevEnd = this.findPreviousChapterEnd(outlineFileName);

    return {
      heading: chapterHeading,
      section1_delegation: `【第一段：开篇委托】\n- 本章目标：规划撰写《${chapterHeading}》正文\n- 目标篇幅：3500 - 4500 字\n- 文风基调：纯正文学质感 + 真实活人口语 + 戏剧张力`,
      
      section2_story: `【第二段：这章的故事与节拍】\n- 上一章末尾承接：\n${prevEnd.split('\n').map(l => '  > ' + l).join('\n')}\n\n- 章纲核心提炼：\n${outlineContent.substring(0, 800)}...`,

      section3_characters: `【第三段：这章的人物状态与驱动力 (POV & 信息边界)】\n- 视角角色锁定：严格以当前视角人物的视线与五感为主，不使用全知上帝视角提前剧透。\n- 角色驱动：承接上一章的情绪与处境，活人开口，对白有潜台词。`,

      section4_guidance: `【第四段：怎么写更顺 (Anti-AI 与质量防守线)】\n- 🚫 严禁公式化转折句式（不是……而是…… / 不只是……更是……）\n- 🚫 严禁章尾与段末升华套话（“这一刻……”、“命运的齿轮……”、“这只是个开始……”）\n- 🚫 严禁现代学术说明腔（“本质上”、“逻辑上”、“情绪价值”）\n- 🚫 严禁集体反应套话（“全场震惊”、“众人齐声”）\n- ⚠️ 疲劳词密度控制（每3000字内仿佛/宛如/猛地/蓦地各最多1次；破折号一章最多3处）\n- 🎯 Show, don't tell：通过身体微反应、眼神、呼吸展现情绪。`,

      section5_hook: `【第五段：收在哪里 (追读力与章末留钩)】\n- 收束要求：戛然而止，绝不回头总结，不替下一章下定义。\n- 悬念落点：停在一个悬而未决的眼神、一句未完的话、远处的微弱响动或危机迫近的瞬间。`
    };
  }

  printBrief(brief) {
    console.log('\n======================================================================');
    console.log(`📋 【Novel Toolkit 工业级单章写作任务书 (Writing Brief)】`);
    console.log(`🎯 目标章节: ${brief.heading}`);
    console.log('======================================================================\n');
    console.log(brief.section1_delegation + '\n');
    console.log(brief.section2_story + '\n');
    console.log(brief.section3_characters + '\n');
    console.log(brief.section4_guidance + '\n');
    console.log(brief.section5_hook + '\n');
    console.log('======================================================================\n');
  }
}

module.exports = ContextAssembler;
