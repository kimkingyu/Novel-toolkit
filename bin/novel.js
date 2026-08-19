#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const ProjectDoctor = require('../src/doctor');
const NarrativeAuditor = require('../src/auditor');
const CanonValidator = require('../src/canon');
const ContextAssembler = require('../src/context_assembler');
const NarrativeWaveAnalyzer = require('../src/wave_analyzer');

const command = process.argv[2];
const targetArg = process.argv[3];

function printHelp() {
  console.log(`
NarraFork Novel Toolkit (网文工业级创作工具箱)

用法:
  novel doctor                   运行项目全景健康度体检
  novel audit [章节文件路径]      对指定章节或最新章节运行 8 维质量审计
  novel canon [章节文件路径]      运行经纬圣约与世界观一致性硬断言
  novel brief [章纲文件路径]      装配生成五段式写前任务书
  novel wave                     分析全书/近期章节情绪波浪与节奏走势
  novel init [目标目录]          初始化一个新的空白小说工程
`);
}

switch (command) {
  case 'doctor': {
    const doctor = new ProjectDoctor();
    const report = doctor.runFullCheck();
    doctor.printSummary(report);
    break;
  }

  case 'audit': {
    const auditor = new NarrativeAuditor();
    let file = targetArg;
    if (!file) {
      file = auditor.findLatestChapter();
      console.log('（未指定章节路径，自动锁定最新修改章节）');
    }
    if (!file || !fs.existsSync(file)) {
      console.error('未找到目标章节文件！');
      process.exit(1);
    }
    const res = auditor.auditFile(file);
    auditor.printReport(res);
    process.exit(res.passed ? 0 : 1);
    break;
  }

  case 'canon': {
    const validator = new CanonValidator();
    if (targetArg) {
      const res = validator.validateFile(targetArg);
      console.log(`\n[经纬校验] ${res.filePath}: ${res.valid ? '✅ 通过' : '❌ 违规'}`);
      res.errors.forEach(e => console.log(`  └─ [${e.category} ｜ ${e.ruleName}] ${e.desc}`));
    } else {
      console.log('\n--- 正在执行全书经纬圣约断言扫描 ---');
      const failures = validator.validateAllZhengwen();
      if (failures.length === 0) {
        console.log('✅ 全书正文完全符合经纬圣约规则，零断言违规！');
      } else {
        console.log(`⚠️  发现 ${failures.length} 个文件存在规则违规：`);
        failures.slice(0, 10).forEach(f => {
          console.log(`\n📄 ${f.filePath}:`);
          f.errors.forEach(e => console.log(`   └─ [${e.category} ｜ ${e.ruleName}] ${e.desc}`));
        });
      }
    }
    break;
  }

  case 'brief': {
    const assembler = new ContextAssembler();
    let outline = targetArg;
    if (!outline) {
      outline = assembler.findLatestOutline();
      console.log('（未指定章纲，自动装配最新章纲）');
    }
    if (!outline) {
      console.error('未找到有效章纲！');
      process.exit(1);
    }
    const brief = assembler.assembleBrief(outline);
    assembler.printBrief(brief);
    break;
  }

  case 'wave': {
    const wave = new NarrativeWaveAnalyzer();
    console.log(wave.generateReport());
    break;
  }

  case 'init': {
    const destDir = path.resolve(targetArg || '.');
    const templateDir = path.join(__dirname, '../templates');
    console.log(`正在将小说工程模板初始化到: ${destDir}`);
    
    const copyRecursive = (src, dest) => {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(item => {
        const sPath = path.join(src, item);
        const dPath = path.join(dest, item);
        if (fs.statSync(sPath).isDirectory()) {
          copyRecursive(sPath, dPath);
        } else {
          fs.copyFileSync(sPath, dPath);
        }
      });
    };
    copyRecursive(templateDir, destDir);
    console.log('✅ 初始化完成！已创建标准创作目录结构与基础模板。');
    break;
  }

  default:
    printHelp();
    break;
}
