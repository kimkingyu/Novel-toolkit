/**
 * 项目全景体检医生 (Project Doctor)
 * 
 * 深度参考 webnovel-writer / PlotPilot 阶段感知体检机制
 */

const fs = require('fs');
const path = require('path');
const CanonValidator = require('./canon');

class ProjectDoctor {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.canonValidator = new CanonValidator(rootDir);
  }

  runFullCheck() {
    const report = {
      timestamp: new Date().toISOString(),
      directories: {},
      stats: {
        totalChapters: 0,
        totalChars: 0,
        avgCharsPerChapter: 0,
        volumeCount: 0,
        characterProfiles: 0,
        activeHooks: 0,
        resolvedHooks: 0,
        hookResolutionRate: '0%'
      },
      diagnostics: [],
      healthScore: 100
    };

    const requiredDirs = [
      '正文', '角色档案', '大纲', '章纲', '小结', '设定', '伏笔', '关系图'
    ];
    requiredDirs.forEach(dir => {
      const exists = fs.existsSync(path.join(this.rootDir, dir));
      report.directories[dir] = exists;
      if (!exists) {
        report.diagnostics.push({ level: 'ERROR', message: `核心目录 [${dir}] 缺失！` });
        report.healthScore -= 10;
      }
    });

    const zhengwenDir = path.join(this.rootDir, '正文');
    if (fs.existsSync(zhengwenDir)) {
      const vols = fs.readdirSync(zhengwenDir).filter(f => fs.statSync(path.join(zhengwenDir, f)).isDirectory());
      report.stats.volumeCount = vols.length > 0 ? vols.length : 1;

      let totalChapters = 0;
      let totalChars = 0;
      const walk = (dir) => {
        fs.readdirSync(dir).forEach(file => {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) walk(full);
          else if (file.endsWith('.md')) {
            totalChapters++;
            const content = fs.readFileSync(full, 'utf8');
            totalChars += content.replace(/\s+/g, '').length;
          }
        });
      };
      walk(zhengwenDir);

      report.stats.totalChapters = totalChapters;
      report.stats.totalChars = totalChars;
      report.stats.avgCharsPerChapter = totalChapters > 0 ? Math.round(totalChars / totalChapters) : 0;
    }

    const roleDir = path.join(this.rootDir, '角色档案');
    if (fs.existsSync(roleDir)) {
      const files = fs.readdirSync(roleDir).filter(f => f.endsWith('.md') && !f.startsWith('_'));
      report.stats.characterProfiles = files.length;
      if (files.length < 3) {
        report.diagnostics.push({ level: 'WARN', message: `角色档案过少 (当前 ${files.length} 个)，建议补齐核心人物小传` });
        report.healthScore -= 5;
      }
    }

    const fubiPath = path.join(this.rootDir, '伏笔', '伏笔.md');
    if (fs.existsSync(fubiPath)) {
      const content = fs.readFileSync(fubiPath, 'utf8');
      const blocks = content.split(/### \d+\.\s+/).slice(1);
      let active = 0;
      let resolved = 0;
      blocks.forEach(b => {
        if (b.includes('已回收')) resolved++;
        else active++;
      });
      report.stats.activeHooks = active;
      report.stats.resolvedHooks = resolved;
      const total = active + resolved;
      const rate = total > 0 ? ((resolved / total) * 100).toFixed(1) + '%' : '0%';
      report.stats.hookResolutionRate = rate;

      if (active > 40) {
        report.diagnostics.push({ level: 'WARN', message: `未回收伏笔较多 (${active} 条)，注意保持线索收束` });
        report.healthScore -= 5;
      }
    } else {
      report.diagnostics.push({ level: 'WARN', message: '未找到 伏笔/伏笔.md 文件' });
      report.healthScore -= 5;
    }

    const failures = this.canonValidator.validateAllZhengwen();
    if (failures.length > 0) {
      report.diagnostics.push({
        level: 'INFO',
        message: `存在 ${failures.length} 个章节命中经纬规则或说教词提醒（已支持一键定位）`
      });
    }

    report.healthScore = Math.max(0, report.healthScore);
    return report;
  }

  printSummary(report) {
    console.log('\n======================================================================');
    console.log('🩺 【小说全书项目健康度体检报告 (Project Doctor)】');
    console.log('----------------------------------------------------------------------');
    console.log(`🏆 健康度指数: ${report.healthScore} / 100 ｜ 运行状态: 良好`);
    console.log(`📚 规模统计: 共 ${report.stats.volumeCount} 卷 ｜ ${report.stats.totalChapters} 章 ｜ 总字数: ${(report.stats.totalChars / 10000).toFixed(1)} 万字 ｜ 平均每章: ${report.stats.avgCharsPerChapter} 字`);
    console.log(`👥 角色档案: ${report.stats.characterProfiles} 个角色小传`);
    console.log(`🎣 伏笔健康: 活跃未回收 ${report.stats.activeHooks} 条 ｜ 已回收 ${report.stats.resolvedHooks} 条 ｜ 回收率: ${report.stats.hookResolutionRate}`);
    console.log('----------------------------------------------------------------------');

    if (report.diagnostics.length === 0) {
      console.log('✨ 【体检结论】工程结构完整，无缺失项或断言异常！');
    } else {
      console.log('📋 【诊断提示项】:');
      report.diagnostics.forEach((d, idx) => {
        const icon = d.level === 'ERROR' ? '🚫' : (d.level === 'WARN' ? '⚠️ ' : '💡');
        console.log(`  ${idx + 1}. ${icon} [${d.level}] ${d.message}`);
      });
    }
    console.log('======================================================================\n');
  }
}

module.exports = ProjectDoctor;
