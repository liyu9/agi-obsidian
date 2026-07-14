# Skills 文件夹优化计划

> 制定日期：2026-04-20
> 涉及文件：`.trae/skills/` 下全部 14 个 Skill

---

## 一、现状总览

| # | Skill | 类型 | 行数 | 质量 | 优先级 |
|---|-------|------|------|------|--------|
| 1 | agi-knowledge-maintainer | 自定义 | 340 | ⭐⭐⭐⭐⭐ | — |
| 2 | book-knowledge-extractor | 自定义 | 145 | ⭐⭐⭐⭐ | P2 |
| 3 | chrome-cdp-live-browser | 自定义 | 98 | ⭐⭐ | P0 |
| 4 | data-agent | 自定义 | 285 | ⭐⭐⭐⭐ | P2 |
| 5 | deep-research | 自定义 | 328 | ⭐⭐⭐ | P1 |
| 6 | geektime-article-extractor | 自定义 | 98 | ⭐⭐⭐⭐ | P2 |
| 7 | multi-turn-thinking | 自定义 | 273 | ⭐⭐⭐ | P1 |
| 8 | tool-calling | 自定义 | 302 | ⭐⭐ | P0 |
| 9 | minimax-image-generation | 自定义 | 161 | ⭐⭐⭐ | P3 |
| 10 | requirements-analyst | 系统 | 129 | ⭐⭐⭐⭐ | — |
| 11 | skill-creator | 系统 | 75 | ⭐⭐⭐⭐ | — |
| 12 | frontend-design | 系统 | 41 | ⭐⭐⭐⭐ | — |
| 13 | fullstack-developer | 系统 | 240 | ⭐⭐⭐⭐ | — |
| 14 | ui-ux-pro-max | 系统 | 103 | ⭐⭐⭐⭐ | — |
| 15 | webapp-testing | 系统 | 91 | ⭐⭐⭐⭐ | P2 |

**自定义 Skill 9 个，系统内置 6 个。**

---

## 二、问题汇总

### 2.1 内容严重过时（P0）

| Skill | 问题 |
|--------|------|
| chrome-cdp-live-browser | 描述和命令全是**编造的**（`js-eyes serve`、`js-eyes tabs list` 等命令不存在）。实际使用的是本地 CDP 脚本 `cdp_scripts/skills/chrome-cdp/scripts/cdp.mjs`（list/eval/html/snap/shot 等）。Prerequisites 说 `npm install -g js-eyes` ✅，但 JS-Eyes 实际无法独立作为 CLI 抓取内容 |

### 2.2 功能冗余或价值低（P0）

| Skill | 问题 |
|--------|------|
| tool-calling | 全 302 行全是泛泛的工具调用理论（决策树、并行/串行调用、参数优化），与 Trae 系统自带的工具调用能力高度重复，没有增量价值。与 deep-research / multi-turn-thinking 的"工具协同策略"部分重叠 |

### 2.3 内容冗长且重叠（P1）

| Skill | 问题 |
|--------|------|
| deep-research | 328 行，大量 ASCII 图、示例场景，核心研究流程淹没在噪音中。与 multi-turn-thinking 有大量重叠（都讲"迭代"、"反思"、"工具协同"） |
| multi-turn-thinking | 273 行，ASCII 图过多（4 层思考层级、5 步流程图、多个场景示例），实际指导性内容不多。与 deep-research 重叠 |

### 2.4 缺少与工作流的联动说明（P2）

| Skill | 问题 |
|--------|------|
| book-knowledge-extractor | 图片提取方式保留 Python 代码示例，实际不执行。命名规范中日期格式有多余空格 |
| data-agent | 今天刚加载，缺少与知识库联动的触发条件说明 |
| geektime-article-extractor | 没有提到提取完成后自动触发 agi-knowledge-maintainer 归档的说明 |
| webapp-testing | 有参考文件但缺少说明 |

### 2.5 缺少触发场景说明（P3）

| Skill | 问题 |
|--------|------|
| minimax-image-generation | 纯 API 文档，没有说明在什么场景下触发（比如"为归档文章生成封面图"） |

---

## 三、优化方案

### 3.1 P0 — 必须立即处理

#### 方案 A：删除 tool-calling

**原因**：功能完全冗余，与系统能力重复，内容无增量价值

**操作**：
```bash
删除 .trae/skills/tool-calling/
```

**风险**：无。相关内容已分散在 deep-research / multi-turn-thinking / data-agent 中

---

#### 方案 B：重写 chrome-cdp-live-browser

**原因**：现有内容是编造的，无法使用

**目标**：保留核心功能（通过 Chrome CDP 抓取需要登录的网页内容），修正命令说明

**重写后的结构**：
```
SKILL.md
├── CDP脚本使用指南（cdp.mjs 命令速查）
│   ├── list    - 列出标签页
│   ├── eval    - 执行JS获取内容
│   ├── html    - 获取页面HTML
│   ├── snap    - 可访问性树快照
│   └── shot    - 页面截图
├── JS-Eyes集成说明（扩展安装 + 服务管理）
├── 与 agi-knowledge-maintainer 的联动说明
└── 触发条件
```

**命令对照表（修正后）**：
| 实际命令 | 功能 |
|---------|------|
| `cdp.mjs list` | 列出所有标签页 |
| `cdp.mjs eval <tab> "<js>"` | 在页面执行JS，返回文本 |
| `cdp.mjs html <tab>` | 获取页面HTML |
| `cdp.mjs snap <tab>` | 可访问性树快照 |
| `cdp.mjs shot <tab>` | 页面截图 |

---

### 3.2 P1 — 计划处理

#### 方案 C：合并 deep-research + multi-turn-thinking

**原因**：两者内容高度重叠（迭代研究、反思机制、工具协同），各自冗长

**合并后的 Skill 名**：`research-and-thinking`

**目标**：控制在 150 行以内

**合并后的结构**：
```
research-and-thinking/
├── SKILL.md（主文件）
│   ├── 思考深度层级（4级，快速→研究）
│   ├── 6步研究流程（边想边搜 + 迭代优化）
│   ├── 反思触发条件
│   └── 工具协同策略
└── references/
    └── thinking-patterns.md（可选：具体思考模式参考）
```

**删除**：
- deep-research（合并后删除）
- multi-turn-thinking（合并后删除）

---

### 3.3 P2 — 建议处理

#### 方案 D：优化 book-knowledge-extractor

- 删除 Python 图片提取代码（实际不执行，增加噪音）
- 统一命名规范（去除多余空格 `YYYYMMDD-序号 - 描述` → `YYYYMMDD-序号-描述`）
- 与 agi-knowledge-maintainer 保持一致的图片处理规则

#### 方案 E：优化 geektime-article-extractor

- 末尾添加联动说明："提取完成后自动调用 agi-knowledge-maintainer 进行归档"
- 可选：补充自动抓取图片的说明

#### 方案 F：完善 data-agent 触发条件

- 添加与知识库工作流的联动说明
- 明确何时使用（数据分析、SQL、可视化、看板）

#### 方案 G：补充 webapp-testing 参考文件说明

- 添加 scripts 目录下的参考文件说明

---

### 3.4 P3 — 可选处理

#### 方案 H：优化 minimax-image-generation

- 添加触发条件说明（"当用户需要为归档文档生成封面图/插图时"）
- 补充与知识库工作流的结合点

---

## 四、执行计划

| 阶段 | 方案 | 操作 | 工作量 |
|------|------|------|--------|
| **阶段1** | 方案A | 删除 tool-calling | 5分钟 |
| **阶段1** | 方案B | 重写 chrome-cdp-live-browser | 30分钟 |
| **阶段2** | 方案C | 合并 deep-research + multi-turn-thinking | 45分钟 |
| **阶段3** | 方案D-G | 优化其他 Skill（可选） | 各10分钟 |

---

## 五、建议优先级

**立即执行（今天）**：
1. ✅ 删除 tool-calling
2. ✅ 重写 chrome-cdp-live-browser

**本周内**：
3. 合并 deep-research + multi-turn-thinking

**后续迭代**：
4-7. P2/P3 优化（可随时进行）

---

## 六、待用户确认

请选择要执行的优化方案：

- [ ] **方案A**：删除 tool-calling
- [ ] **方案B**：重写 chrome-cdp-live-browser
- [ ] **方案C**：合并 deep-research + multi-turn-thinking
- [ ] **方案D-G**：P2 优化（book/data-agent/geektime/webapp）
- [ ] **方案H**：P3 优化（minimax-image-generation）
