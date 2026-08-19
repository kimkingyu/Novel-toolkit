# NarraFork Novel Toolkit (网文工业级长篇创作工具箱)

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node">
  <img src="https://img.shields.io/badge/AI-Novel_Writing-orange.svg" alt="AI">
  <img src="https://img.shields.io/badge/Status-Production_Ready-brightgreen.svg" alt="Status">
</p>

一套专为长篇网络小说连载设计的工业级 AI 辅助创作工具箱。解决长篇 AI 创作中的**设定遗忘、逻辑崩坏、AI味泛滥、情绪节奏失控与大纲偏离**等核心痛点。

---

## 🌟 核心能力全景

| 模块 | CLI 命令 | 功能说明 |
|---|---|---|
| **项目体检医生 (Doctor)** | `novel doctor` | 秒级扫描全书目录、章节规模、伏笔闭环率与世界观一致性 |
| **8 维质量审计 (Auditor)** | `novel audit [章节]` | 阻断级去AI味、句式节奏检测、疲劳词密度控制与 8 维度评分雷达 |
| **经纬圣约断言 (Canon)** | `novel canon [章节]` | 角色生理/口吻/世界观境界硬规则校验，严防“吃书” |
| **写作任务书装配 (Brief)** | `novel brief [章纲]` | 一键衔接前文、注入 POV 信息边界与 Anti-AI 防守线，生成五段式任务书 |
| **情绪波浪走势 (Wave)** | `novel wave` | 计算章节冲突张力与情绪波浪，提供张弛平衡写作建议 |
| **全景可视化看板 (Dashboard)** | `node dashboard/serve.js` | D3 力导向人物关系拓扑、伏笔折叠库与走势仪表盘 |

---

## 🚀 快速上手

### 1. 全局安装 / 本地运行
```bash
# 进入项目目录
npm link

# 运行全书体检
novel doctor

# 审计最新完成的章节
novel audit

# 装配下一章写前任务书
novel brief
```

### 2. 初始化全新小说工程
```bash
novel init /path/to/your/new-novel
```

---

## 🛠️ 设计架构理念

本工具箱深度汲取并融合了多个优秀开源项目（`webnovel-writer`、`dramatica-flow`、`PlotPilot`、`Inkos` 等）的精髓：
1. **写前契约化**：章纲即法律，通过五段写作任务书锁定角色动机与 POV 信息边界。
2. **写后零 LLM 硬规则阻断**：机械层快速拦截“公式化转折”、“说书人升华”与“疲劳词泛滥”。
3. **状态可度量可沉淀**：伏笔回收闭环跟踪，持续输出项目健康度与雷达得分。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。
