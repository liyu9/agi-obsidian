# PromptHub 研发流程指南

> 本文档是《PromptHub研发流程文档》的执行指南，提供每个阶段的核心步骤、Agent协作示例和注意事项。

---

## 阶段1：需求分析

**协作模式**: 咨询模式  
**核心产出物**: 功能清单、边界文档、CLAUDE.md项目概述  
**关键原则**: AI给的信息不能直接信，要验证

---

### 步骤1.1：调研标杆

**作用**: 理解领域全貌，识别核心/边缘功能

**Agent输入示例**:
```
帮我梳理 PromptPilot（基于你对我描述的产品定位：一个面向内部的Prompt生成、管理和优化平台）的核心功能模块，按类别分组，每个模块用一两句话说明它做什么。
重点关注：
1. Prompt生成模块（任务类型选择、模型选择、流式输出）
2. Prompt管理模块（任务列表、版本管理）
3. Prompt优化模块（一键改写、改进建议）
4. 支撑功能（变量填写、评分、多轮对话）
```

**Agent输出示例**:
```
一、Prompt生成模块
   - 任务类型选择（文本理解、视觉理解、多轮对话三种模式）
   - 任务描述输入（用户输入功能需求）
   - 模型选择（支持多个AI模型切换）
   - AI生成Prompt（结构完整、格式规范）
   - 流式输出（打字机效果，实时展示）

二、Prompt管理模块
   - 任务列表（统一管理所有Prompt）
   - 版本管理（创建、切换、对比）
   - Prompt编辑（在线编辑、实时保存）

三、Prompt优化模块
   - 一键改写（基于反馈快速优化）
   - 改进建议（AI提供具体优化建议）
   - 版本回溯（支持恢复历史版本）

四、支撑功能
   - 变量填写（动态表单生成）
   - 模型回答生成（流式响应）
   - 评分功能（1-5分量化评价）
   - 多轮对话测试（连续交互）
```

**核心注意事项**:
- ❌ 不要直接相信AI输出
- ✅ 用官方文档/截图核对功能描述准确性
- ✅ 验证是否有遗漏的功能
- ✅ 验证功能之间的依赖关系

---

### 步骤1.2：功能取舍

**作用**: 聚焦核心，砍掉边缘，用三问裁剪法定优先级

**Agent输入示例**:
```
我要做一个内部使用的Prompt管理平台（类PromptPilot简化版）。
约束：一个人开发，面向50人以内的内部用户。
请从刚才的功能列表中，用三问裁剪法判断哪些必须做、哪些可以砍掉：
1. 没有它产品还成立吗？
2. 做到什么程度够用？
3. 能不能一句话说清楚？
给每个功能一个明确的"做"或"砍"决策，并说明理由。
```

**Agent输出示例**:
```
| 功能 | AI建议 | 理由 |
|------|--------|------|
| Prompt生成 | 必须做 | 核心价值，无它不成立 |
| 版本管理 | 必须做 | 刚需功能，调试必需 |
| 一键改写 | 必须做 | 优化闭环 |
| 变量填写 | 必须做 | 调试必需 |
| 模型回答生成 | 必须做 | 核心功能 |
| 评分功能 | 可以做 | 用户价值高 |
| 多轮对话 | 可以做 | 可延后 |
| 批量评测 | 砍掉 | 非核心，复杂度高 |
| 知识库 | 砍掉 | 二期再做 |
| GSB评价 | 砍掉 | 主观评价难以统一 |
```

**核心注意事项**:
- ✅ 三问裁剪法：①没有它产品还成立吗？②做到什么程度够用？③能不能一句话说清楚？
- ✅ 按优先级分层：P0（必须做）、P1（可以做）、P2（二期）
- ✅ 人类最终拍板，AI只是辅助决策

---

### 步骤1.3：技术选型

**作用**: 确定技术栈，对比方案优劣

**Agent输入示例**:
```
帮我对比以下前端技术方案，重点考虑开发效率、AI SDK支持：
1) React + TypeScript + Vite
2) Vue 3 + TypeScript + Vite
3) Svelte + TypeScript

考虑因素：
- 组件化开发效率
- AI模型接入复杂度
- 状态管理方案（需要支持流式响应）
- 学习曲线（AI辅助编程场景）
```

**Agent输出示例**:
```
| 方案 | 组件化效率 | AI SDK支持 | 流式响应 | 学习曲线 | 推荐度 |
|------|------------|------------|----------|----------|--------|
| React+TS+Vite | 高 | 丰富 | 中 | 中 | ⭐⭐⭐ |
| Vue3+TS+Vite | 高 | 良好 | 高 | 低 | ⭐⭐⭐ |
| Svelte+TS | 最高 | 一般 | 中 | 中 | ⭐⭐ |

推荐：React + TypeScript + Vite
理由：生态成熟，组件库丰富，AI SDK支持完善
```

**核心注意事项**:
- ✅ 追问修正AI的通用建议："在流式响应场景下，React和Vue哪个更合适？"
- ✅ 用项目约束修正AI的默认推荐
- ✅ 技术选型要匹配团队能力和项目约束

---

### 步骤1.4：运维预期

**作用**: 评估系统压力，提前规划运维方案

**Agent输入示例**:
```
PromptHub是内部Prompt管理平台，50人同时使用，
主要功能是流式Prompt生成和回答。
请估算：
1. 峰值QPS和并发数
2. SSE长连接数量
3. 需要提前考虑的运维事项
4. Docker Compose部署建议
```

**Agent输出示例**:
```
1. 峰值QPS：10-20（生成操作低频）
2. 并发数：20-30（正常）、50（峰值）
3. SSE长连接：20-30（每个用户1个）
4. 运维事项：
   - SSE连接超时控制（建议120s）
   - 流式响应缓存
   - 模型API熔断
5. 部署建议：
   - Docker Compose一键部署
   - PostgreSQL数据持久化
   - 前端Nginx静态服务
```

**核心注意事项**:
- ✅ 关注QPS、并发、SSE连接数
- ✅ 流式响应是主要压力点
- ✅ 提前规划超时、熔断、重试机制

---

### 步骤1.5：写进CLAUDE.md

**作用**: 沉淀项目概述，形成团队共识

**Agent输入示例**:
```
根据我们的讨论，把PromptHub的项目概述写进CLAUDE.md的"项目概述"部分。
包括：产品定位、做什么、不做什么、技术栈、部署与运维预期。
```

**Agent输出示例**:
```markdown
# PromptHub项目概述

## 产品定位
一个面向公司内部的Prompt管理平台，支持Prompt生成、管理和优化，
帮助全员快速创建高质量的AI提示词。

## 做什么
- Prompt生成：AI自动生成，结构完整，流式输出
- Prompt管理：任务列表、版本管理、版本对比
- Prompt优化：一键改写、改进建议、版本回溯
- 支撑功能：变量填写、模型回答、评分、多轮对话

## 不做什么（一期）
- 批量评测、知识库管理、GSB评价
- 深度思考展示、模型参数调整
- 智能精调、工具调用

## 技术栈
- 前端：React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- 后端：Node.js + Express + PostgreSQL
- 模型接入：Volcano Engine API

## 运维预期
- 用户：50人以内内部使用
- 主要压力：流式SSE响应
- 部署：Docker Compose一键启动
```

**核心注意事项**:
- ✅ 包含产品定位、做什么、不做什么、技术栈、运维预期
- ✅ 边界要明确，方便后续决策
- ✅ 这是Claude Code的上下文基础，要写清楚

---

## 阶段2：边界定义

**协作模式**: 人类主导  
**核心产出物**: 产品边界文档  
**关键原则**: 边界越明确越不会跑偏

---

### 步骤2.1：定义核心范围

**作用**: 明确做什么，按优先级分层

**输出格式**:
```markdown
## 一期核心范围
✅ Prompt生成
   - 三种任务类型（文本/视觉/多轮对话）
   - 单次AI生成 + 流式输出
   - 模型选择（豆包/DeepSeek）

✅ Prompt管理
   - 任务CRUD（最多100个任务）
   - 版本管理（每个任务最多10个版本）
   - 版本对比（左右视图+差异高亮）
   - Prompt编辑（在线编辑）

✅ Prompt优化
   - 一键改写（基于反馈）
   - 改进建议（列表展示）
   - 版本回溯（恢复历史）

✅ 支撑功能
   - 用户认证（JWT）
   - 变量填写（文本类型）
   - 模型回答生成（流式）
   - 评分（1-5分）
   - 多轮对话（最多10轮）
```

**核心注意事项**:
- ✅ 按优先级分层：P0（核心价值）、P1（重要但可延后）
- ✅ 边界要具体，不要模糊："任务CRUD" vs "任务管理"
- ✅ 数量限制要明确："最多100个任务"、"最多10个版本"

---

### 步骤2.2：定义不做范围

**作用**: 明确不做什么，避免范围蔓延

**输出格式**:
```markdown
## 一期不做（二期）
❌ 批量评测
❌ 知识库管理
❌ GSB评价
❌ 深度思考
❌ 模型参数调整
❌ 智能精调
❌ 工具调用
```

**核心注意事项**:
- ✅ 用阶段1的三问裁剪法结论
- ✅ 原因要记录，方便后续评估
- ✅ 边界越具体越好，越明确越不会跑偏

---

### 步骤2.3：写边界文档

**作用**: 沉淀为一页纸文档，形成团队共识

**输出格式**:
```markdown
# PromptHub一期边界文档

## 目标
团队内部Prompt管理平台（50人以内使用）

## 一期核心范围
✅ ...

## 一期不做（二期）
❌ ...
```

**核心注意事项**:
- ✅ 一页纸原则，简洁明了
- ✅ 人类自己写，AI辅助补充
- ✅ 边界文档是Claude Code的约束条件

---

## 阶段3：数据建模

**协作模式**: 人类主导  
**核心产出物**: 数据库ER图  
**关键原则**: 数据库规范是AI容易跑偏的地方

---

### 步骤3.1：梳理实体

**作用**: 识别核心对象，按阶段2边界来

**Agent输入示例**:
```
根据以下业务需求，识别核心实体：

业务需求：
1. 用户需要登录系统
2. 用户可以创建Prompt任务
3. 每个任务有多个版本
4. 用户可以对版本评分
5. 用户可以和AI多轮对话

按阶段2的边界来，不要多做。
```

**Agent输出示例**:
```
核心实体：
1. User（用户）- 登录、认证
2. Task（Prompt任务）- CRUD
3. Version（版本）- 版本管理
4. Rating（评分）- 评分记录
5. Message（对话消息）- 多轮对话
```

**核心注意事项**:
- ✅ 按阶段2的边界来，不要多做
- ✅ 只识别核心实体，边缘实体延后
- ✅ 数量要控制，不要过度设计

---

### 步骤3.2：定义表结构

**作用**: 设计数据模型，规范必须明确

**数据库规范要点**:
```
- 主键：BIGINT AUTO_INCREMENT，禁止UUID
- 时间字段：DATETIME(3)
- 逻辑删除：deleted TINYINT(1)
- 索引命名：idx_{表名}_{字段名}
- 禁止NULL，空值用空字符串或0
```

**Agent输入示例**:
```
根据以下实体，设计PostgreSQL表结构：

1. 用户表（id, username, password, email, created_at, updated_at, deleted）
2. Prompt任务表（id, user_id, name, task_type, status, current_version_id, timestamps, deleted）
3. Prompt版本表（id, task_id, version_number, content, description, created_at, deleted）
4. 评分记录表（id, version_id, user_id, score, comment, created_at）
5. 对话历史表（id, task_id, round_number, role, content, created_at）

规范要求：
- 主键 BIGINT AUTO_INCREMENT，禁止UUID
- 时间字段 DATETIME(3)
- 逻辑删除 deleted TINYINT(1)
- 索引命名 idx_{表名}_{字段名}
- 禁止NULL，空值用空字符串或0

请输出完整的建表SQL语句。
```

**核心注意事项**:
- ✅ 规范必须明确，不要让AI自己推断
- ✅ 每条规范都要写清楚，不要模糊
- ✅ 用curl验证建表SQL执行成功

---

### 步骤3.3：写建表SQL

**作用**: 输出可执行脚本，用curl验证

**Agent输出示例**:
```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL DEFAULT '',
    password VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(100) NOT NULL DEFAULT '',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**核心注意事项**:
- ✅ 用psql或工具验证建表成功
- ✅ 检查索引是否正确创建
- ✅ 确认逻辑删除字段存在

---

## 阶段4：规范编写（SDD核心）

**协作模式**: 人类主导  
**核心产出物**: CLAUDE.md规范  
**关键原则**: 规范是节省时间的捷径，不是额外负担

### SDD四步闭环

```
① 定规范 → ② AI执行 → ③ 人验证 → ④ 迭代规范
```

---

### 步骤4.1：定规范

**作用**: 定义标准和边界，让AI知道怎么做

**Agent输入示例**:
```
帮我为PromptHub项目编写CLAUDE.md的规范部分，包括：

1. **组件命名规范**
   - 页面组件：Prompt: /pages/ + PascalCase，如 PromptGenerator.tsx
   - 业务组件：Prompt: /components/ + PascalCase，如 VersionSwitcher.tsx
   - UI组件：Prompt: /components/ui/ + PascalCase，如 Button.tsx

2. **API接口规范**
   - 路径规范：/api/v1/{资源复数名}
   - 返回格式：Result<T> { code, message, data }
   - 错误码：1000-1999通用，2000-2999业务

3. **设计原则**
   - Controller只做参数校验，不写业务逻辑
   - Service只调接口，不直接new实现类
   - 不引入不必要的设计模式
```

**Agent输出示例**:
```markdown
# 代码规范

## 组件命名

| 类型 | 路径 | 命名规则 | 示例 |
|------|------|----------|------|
| 页面组件 | /pages/ | PascalCase | PromptGenerator.tsx |
| 业务组件 | /components/ | PascalCase | VersionSwitcher.tsx |
| UI组件 | /components/ui/ | PascalCase | Button.tsx |

## API规范

### 路径
- RESTful风格：/api/v1/{资源复数名}
- 示例：GET /api/v1/prompts

### 返回格式
```typescript
interface Result<T> {
  code: number;      // 0=成功，其他=失败
  message: string;    // 错误信息
  data: T;          // 数据
}
```

### 错误码
- 1000-1999：通用错误
- 2000-2999：业务错误
```

**核心注意事项**:
- ✅ 规范要明确，不要模糊："PascalCase" vs "驼峰命名"
- ✅ 给出具体示例，不要让AI自己推断
- ✅ 覆盖常见场景，减少后续补充

---

### 步骤4.2：AI执行

**作用**: 按规范实现，每次只做一层

**Agent输入示例**:
```
按照CLAUDE.md中的规范，实现Prompt任务的CRUD接口：

要求：
1. 路径：/api/v1/prompts
2. 返回格式：Result<T>
3. 错误码区分：1001=任务不存在，1002=创建失败
4. 使用Express框架
5. 先实现Entity和Mapper层

每次只实现一层，完成后告诉我验收命令。
```

**Agent输出示例**:
```typescript
// entity/PromptTask.ts
export interface PromptTask {
  id: number;
  userId: number;
  name: string;
  taskType: string;
  status: string;
  currentVersionId: number;
  createdAt: Date;
  updatedAt: Date;
  deleted: number;
}

// mapper/PromptTaskMapper.ts
import { Result } from '../shared/Result';

export class PromptTaskMapper {
  static toEntity(row: any): PromptTask {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      taskType: row.task_type,
      status: row.status,
      currentVersionId: row.current_version_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deleted: row.deleted,
    };
  }
}
```

**核心注意事项**:
- ✅ 每次只做一层，不要多层一起做
- ✅ 按CLAUDE.md规范执行
- ✅ 完成后立即验证，不要积累问题

---

### 步骤4.3：人验证

**作用**: 检查是否符合要求，用三步检查法

**三步检查法**:

| 步骤 | 检查什么 | 具体操作 |
|------|----------|----------|
| 第一步 | 查意图 | 它做的是不是让你做的？有没有擅自添加功能？ |
| 第二步 | 查质量 | 风格、规范、一致性（命名、返回格式等） |
| 第三步 | 查边界 | 错误处理、异常、潜在风险 |

**核心注意事项**:
- ✅ 查意图：有没有擅自添加功能
- ✅ 查质量：命名、返回格式是否一致
- ✅ 查边界：错误处理是否完善

---

### 步骤4.4：迭代规范

**作用**: 补充遗漏的规则，持续完善规范

**迭代格式**:
```
这个AI跑偏了，补一条规范：
错误：[描述问题]
规范：[补充的规范内容]
原因：[为什么要加这条规范]
```

**迭代案例**:

| 发现时间 | 问题 | 补充规范 |
|----------|------|----------|
| 第一周 | 空数组返回null导致前端报错 | "列表字段空时返回空数组[]，不返回null" |
| 第二周 | 擅自添加了批量删除功能 | "不添加边界文档外的功能，需要先问我" |
| 第三周 | 接口破坏已有契约 | "修改已有接口前，先理解相关模块的设计意图" |

**核心注意事项**:
- ✅ 发现问题立即补规范，不要积累
- ✅ 记录发现时间和问题，方便追溯
- ✅ 规范补充后要通知相关人

---

## 阶段5：架构设计

**协作模式**: 咨询模式  
**核心产出物**: 架构决策文档  
**关键原则**: 用项目约束修正AI的通用建议

---

### 步骤5.1：应用架构

**作用**: 确定代码组织方式，模块化单体是首选

**Agent输入示例**:
```
PromptHub是内部工具，一个人开发，模块化单体是最佳选择。
请设计：
1. 前端目录结构（components/pages/stores/hooks/services）
2. 后端目录结构（routes/controllers/services/models）
3. 组件分层（Page/BusinessComponent/UIComponent的职责边界）

重点：让Claude Code知道什么该写、什么不该写。
```

**Agent输出示例**:
```
前端目录结构：
├── components/          # 组件
│   ├── ui/              # UI基础组件
│   ├── business/         # 业务组件
│   └── pages/           # 页面组件
├── stores/              # Zustand状态
├── hooks/               # 自定义Hook
├── services/            # API服务
└── types/               # 类型定义

后端目录结构：
├── routes/              # 路由入口
├── controllers/         # 请求处理
├── services/           # 业务逻辑
├── models/              # 数据模型
├── middleware/          # 中间件
└── shared/              # 共享代码
```

**核心注意事项**:
- ✅ 模块化单体是首选，简单清晰
- ✅ 组件分层要明确职责边界
- ✅ 让Claude Code知道什么该写、什么不该写

---

### 步骤5.2：流式响应设计

**作用**: 解决SSE问题，给出具体代码示例

**Agent输入示例**:
```
PromptHub需要实现SSE流式响应（打字机效果），
请设计：
1. 前端如何接收流式响应（EventSource vs Fetch + ReadableStream）
2. 后端如何发送流式响应（res.write vs streaming Response）
3. 流式输出的状态管理（Zustand如何处理流式数据）

给出具体的代码示例。
```

**Agent输出示例**:
```javascript
// 前端：Fetch + ReadableStream
const response = await fetch('/api/generate', {
  method: 'POST',
  body: JSON.stringify({ prompt: '...' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // 处理流数据：更新UI、拼接文本
  setContent(prev => prev + chunk);
}

// 后端：SSE
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
});

res.write(`data: ${JSON.stringify({ content: '...' })}\n\n`);
```

**核心注意事项**:
- ✅ Fetch + ReadableStream 优于 EventSource
- ✅ 超时控制：同步60s，SSE 120s
- ✅ 前端要处理流数据拼接和UI更新

---

### 步骤5.3：外部调用设计

**作用**: 解决LLM调用问题，并发控制+容错机制

**Agent输入示例**:
```
LLM调用有四大问题：慢、不稳定、超时控制、重试策略。
PromptHub使用Volcano Engine API，请设计：
1. 线程池隔离方案（对话接口独立线程池）
2. 超时控制（同步60s，SSE 120s）
3. 重试策略（按异常类型区分处理）
4. 错误处理（网络超时/认证失败/模型不存在）

给出具体的实现方案。
```

**Agent输出示例**:
```
1. 线程池隔离：
   - 对话接口：独立线程池，最大5并发
   - 生成接口：独立线程池，最大10并发

2. 超时控制：
   - connect: 5s
   - read: 30-45s
   - total: 60-90s

3. 重试策略：
   - 指数退避：1s → 2s → 4s
   - 随机抖动：±20%
   - 按Provider配置：
     * OpenAI: 3次
     * Claude: 2次
     * Ollama: 1次

4. 不重试：
   - 401 认证错误
   - 400 参数错误
   - quota耗尽
```

**核心注意事项**:
- ✅ 按Provider配置重试策略
- ✅ 熔断机制：连续失败5次后熔断60s
- ✅ 快速失败：熔断时直接拒绝

---

## 阶段6：任务拆解

**协作模式**: 人类主导  
**核心产出物**: WBS任务清单  
**关键原则**: 拆得好Agent一次做对；拆得差反复返工

---

### 步骤6.1：识别依赖

**作用**: 确定先后顺序，先地基后框架

**Agent输入示例**:
```
请分析Prompt生成模块的任务依赖关系：

任务列表：
1. 数据库表创建
2. Prompt任务Entity+Mapper
3. DTO请求/响应对象
4. Service CRUD
5. 生成API（流式）
6. 前端任务类型选择组件
7. 前端Prompt编辑器组件
8. 前端流式输出组件
9. 前端生成页面整合

请给出依赖关系图。
```

**Agent输出示例**:
```
依赖关系：
G-01（数据库表创建）→ G-02（Entity+Mapper）→ G-03（DTO）→ G-04（Service）→ G-05（API）
G-06（前端组件选择）→ G-07（编辑器）→ G-08（流式输出）→ G-09（页面整合）

并行任务：
- G-01~G-05：后端链路
- G-06~G-08：前端组件

依赖任务：
- G-09 依赖 G-05 和 G-08
```

**核心注意事项**:
- ✅ 先地基后框架
- ✅ 后端和前端可并行
- ✅ 明确依赖关系，避免返工

---

### 步骤6.2：按层拆分

**作用**: 隔离复杂度，每任务只涉及一层

**Agent输入示例**:
```
请把Prompt生成模块拆解为WBS任务清单，
要求：
1. 每个任务只涉及一层（数据层/接口层/业务层/UI层）
2. 产出物可独立验证
3. 从底层往上层搭
```

**Agent输出示例**:
```
| 任务ID | 任务内容 | 依赖任务 | 验收标准 |
|--------|----------|----------|----------|
| G-01 | 数据库表创建 | 无 | psql建表成功 |
| G-02 | Prompt任务Entity+Mapper | G-01 | npm run compile成功 |
| G-03 | DTO请求/响应对象 | G-02 | 类型定义正确 |
| G-04 | Service CRUD | G-03 | curl POST/GET成功 |
| G-05 | 生成API（流式） | G-04 | SSE流正常接收 |
| G-06 | 前端任务类型选择组件 | 无 | 三种类型可切换 |
| G-07 | 前端Prompt编辑器组件 | 无 | 内容可编辑保存 |
| G-08 | 前端流式输出组件 | G-06,G-07 | 打字机效果正常 |
| G-09 | 前端生成页面整合 | G-08 | 端到端可运行 |
```

**核心注意事项**:
- ✅ 每任务只涉及一层
- ✅ 产出物可独立验证
- ✅ 从底层往上层搭

---

### 步骤6.3：定义验收

**作用**: 确定完成标准，每步完成后立即验证

**验收标准格式**:
```
| 验收方式 | 具体操作 | 预期结果 |
|----------|----------|----------|
| 命令行 | curl POST /api/v1/prompts | 返回200+JSON |
| 编译 | npm run compile | 无错误 |
| 浏览器 | 点击生成按钮 | 流式输出正常 |
```

**核心注意事项**:
- ✅ 每步完成后立即验证
- ✅ 验收标准要具体可执行
- ✅ 不要积累问题到最后

---

## 阶段7：编码执行

**协作模式**: 执行模式  
**核心产出物**: 业务代码  
**关键原则**: 必须使用三步检查法验收每一行代码

### 标准交付流程

```
① 咨询模式想清楚 → ② 按层拆解任务 → ③ 逐步执行验证 → ④ 前端对接 → ⑤ 完整验收
```

---

### 步骤7.1：精确指令

**作用**: 给出完整明确的指令，避免模糊

**精确指令公式**:
```
[规范引用] + [技术选型] + [功能范围] + [边界条件] + [排除项]
```

**模糊指令** ❌:
```
帮我实现Prompt生成功能
```

**精确指令** ✅:
```
按照CLAUDE.md规范，使用React+TypeScript，实现Prompt生成页面，包含：
1. 任务类型选择（文本/视觉/多轮对话三种卡片）
2. 任务描述输入框（最多500字）
3. 生成按钮（点击后调用/api/v1/generate，流式展示结果）

不包含：知识库选择、批量生成
```

**核心注意事项**:
- ✅ 规范引用：按CLAUDE.md规范
- ✅ 功能范围：明确包含什么
- ✅ 排除项：明确不包含什么

---

### 步骤7.2：三步检查

**作用**: 验收AI输出，确保符合要求

**三步检查法**:

| 步骤 | 检查什么 | 具体操作 |
|------|----------|----------|
| 第一步 | 查意图 | 它做的是不是你让它做的？有没有擅自添加功能？ |
| 第二步 | 查质量 | 风格、规范、一致性（命名、返回格式等） |
| 第三步 | 查边界 | 错误处理、异常、潜在风险（如并发问题） |

**核心注意事项**:
- ✅ 第一步优先级最高：是否按要求执行
- ✅ 查质量：命名规范、返回格式
- ✅ 查边界：错误处理是否完善

---

### 步骤7.3：逐步验证

**作用**: 每步完成后立即验证，不积累问题

**验收流程**:
```
后端验证（curl）→ 前端验证（浏览器）→ 端到端验证（完整链路）
```

**验收标准**:

| 步骤 | 验收内容 | 验收方式 |
|------|----------|----------|
| 后端 | 接口可用 | curl命令返回200 |
| 前端 | 功能可用 | 浏览器操作验证 |
| 端到端 | 全流程通 | 完整链路走通 |

**核心注意事项**:
- ✅ curl通了不算完，浏览器链路才是闭环
- ✅ 每次只做一层，完成后验证
- ✅ 问题发现越早越好

---

## 阶段8：基础设施

**协作模式**: 咨询模式  
**核心产出物**: 公共组件  
**关键原则**: 用咨询模式查漏补缺

---

### 步骤8.1：基础组件规划

**作用**: 识别必需的基础组件，按优先级排序

**基础组件三档**:

| 档位 | 内容 | 完成时机 | 优先级 |
|------|------|----------|--------|
| 第一档 | Tailwind配置、基础CSS变量、布局框架 | 必须先做 | P0 |
| 第二档 | UI组件库（Button、Input、Modal等）、Zustand stores | 第一个功能前 | P0 |
| 第三档 | 流式响应工具、评分组件、版本对比组件 | 功能开发中 | P1 |

**Agent输入示例**:
```
PromptHub项目工程骨架已经搭好。现在要开始做业务功能了。
在写业务代码之前，还需要准备哪些基础组件？
从以下几个角度帮我梳理：
1. 前端UI组件（必须有的基础组件清单）
2. 状态管理（需要哪些Zustand store）
3. API服务层（统一的请求封装）
4. 类型定义（统一的TypeScript类型）
```

**Agent输出示例**:
```
1. 前端UI组件（P0）：
   - Button（支持loading状态）
   - Input（支持error状态）
   - Modal（支持关闭动画）
   - Card（支持hover效果）

2. 状态管理（P0）：
   - userStore（用户信息）
   - promptStore（当前Prompt）

3. API服务层（P0）：
   - apiClient（统一请求封装）
   - promptsApi（Prompt相关接口）

4. 类型定义（P0）：
   - Result<T>通用类型
   - PromptTask实体类型
```

**核心注意事项**:
- ✅ 第一档必须先做，第二档第一个功能前做
- ✅ 用咨询模式让AI帮你查漏补缺
- ✅ 组件要可复用，不要重复造轮子

---

## 阶段9：联调测试

**协作模式**: 执行模式  
**核心产出物**: 可运行系统  
**关键原则**: curl通了不算完，浏览器走完整链路才是真正的交付闭环

---

### 步骤9.1：后端验证

**作用**: 确保API可用，用curl验证

**Agent输入示例**:
```
帮我验证Prompt生成模块的完整链路：

1. 后端验证
   - curl POST /api/v1/prompts - 创建任务
   - curl GET /api/v1/prompts - 获取列表
   - curl POST /api/v1/generate - 流式生成

请给出具体的curl命令和预期响应。
```

**Agent输出示例**:
```bash
# 创建任务
curl -X POST http://localhost:3000/api/v1/prompts \
  -H "Content-Type: application/json" \
  -d '{"name":"测试任务","taskType":"text"}'

# 预期响应
{"code":0,"message":"success","data":{"id":1,"name":"测试任务"}}

# 获取列表
curl -X GET http://localhost:3000/api/v1/prompts

# 预期响应
{"code":0,"message":"success","data":[{"id":1,"name":"测试任务"}]}
```

**核心注意事项**:
- ✅ 每个curl命令都要执行
- ✅ 验证返回格式是否正确
- ✅ 错误码是否按规范返回

---

### 步骤9.2：前端验证

**作用**: 确保功能可用，用浏览器验证

**验收清单**:

| 验收项 | 操作 | 预期结果 |
|--------|------|----------|
| 任务类型选择 | 点击三种类型卡片 | 可切换，选中状态正确 |
| 任务描述输入 | 输入内容 | 实时显示，字数统计正确 |
| 生成按钮 | 点击生成按钮 | 调用API，显示loading |
| 流式输出 | 等待AI响应 | 打字机效果，逐字显示 |

**核心注意事项**:
- ✅ 浏览器验证是必须的
- ✅ 检查UI交互是否流畅
- ✅ 检查错误提示是否友好

---

### 步骤9.3：端到端验证

**作用**: 确保全流程通，走完整链路

**完整链路**:

```
1. 创建Prompt任务
2. 输入任务描述
3. 选择任务类型
4. 点击生成按钮
5. 等待流式响应
6. 保存Prompt版本
7. 查看版本列表
8. 测试版本对比
```

**核心注意事项**:
- ✅ 走完整链路，不跳步
- ✅ 检查边界情况（空输入、超长输入）
- ✅ 检查错误恢复（网络中断后重试）

---

## 阶段10：部署交付

**协作模式**: 执行模式  
**核心产出物**: Docker镜像  
**关键原则**: Agent处理配置，人类验收

---

### 步骤10.1：Docker配置

**作用**: 定义容器化方案，多阶段构建优化体积

**Agent输入示例**:
```
PromptHub需要Docker Compose一键部署，包含：
1. 前端（React构建 + Nginx）
2. 后端（Node.js）
3. 数据库（PostgreSQL）

请输出完整的docker-compose.yml和Dockerfile。
要求：
- 多阶段构建优化体积
- 数据卷持久化
- 环境变量配置
- 健康检查
```

**Agent输出示例**:
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/prompthub
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s

  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=prompthub
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

volumes:
  pgdata:
```

**核心注意事项**:
- ✅ 多阶段构建优化镜像体积
- ✅ 数据卷持久化防止数据丢失
- ✅ 健康检查确保服务可用

---

### 步骤10.2：验收部署

**作用**: 确保可运行，人类验收确认

**验收清单**:

| 验收项 | 操作 | 预期结果 |
|--------|------|----------|
| 启动 | docker-compose up | 所有服务启动成功 |
| 健康检查 | curl localhost:3000/health | 返回200 |
| 前端访问 | 浏览器打开localhost | 页面正常显示 |
| 后端API | curl localhost:3000/api/v1/prompts | 返回200 |

**核心注意事项**:
- ✅ Agent处理配置工作
- ✅ 人类负责验收确认
- ✅ 记录部署过程，方便回滚

---

## Agent协作速查

| 场景 | 向Agent提问 | 输出期望 |
|------|-------------|----------|
| 调研标杆 | "帮我梳理XXX的核心功能模块..." | 按类别分组的功能清单 |
| 功能取舍 | "用三问裁剪法判断哪些必须做..." | 决策表（做/砍+理由） |
| 技术选型 | "对比XX和YY在XX场景..." | 对比分析+推荐 |
| 设计表结构 | "设计PostgreSQL表结构..." | 完整建表SQL |
| 定规范 | "编写CLAUDE.md规范..." | 规范章节 |
| 精确指令 | "[规范]+[技术选型]+[功能范围]+[排除项]" | 符合规范的实现 |
| 验收检查 | "三步检查法：查意图/查质量/查边界" | 验证结论 |
| Docker部署 | "输出docker-compose.yml和Dockerfile..." | 可执行的部署文件 |

---

**关联文档**: 《PromptHub研发流程文档.md》
