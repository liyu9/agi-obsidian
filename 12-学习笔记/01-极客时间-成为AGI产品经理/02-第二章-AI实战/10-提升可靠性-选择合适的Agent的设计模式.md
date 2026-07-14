# 10｜提升可靠性：选择合适的Agent的设计模式

> 来源：极客时间《成为 AGI 产品经理》
> 作者：产品二姐
> 讲述时长：15:37

---

## 目录

- [正文](#正文)
- [配图](#配图)

---

## 正文

你好，我是产品二姐。

接着前两节课里的那张流程图，这节课我们来讲述在 Query 路由之后，如何把检索结果生成回答。

你有没有想过以下几种情况：

- 生成回答前，发现检索结果中没有答案怎么办？
- 生成回答的过程中，有些复杂问题会衍生出来新的问题怎么办？
- 生成回答后，发现回答和检索结果内容不符怎么办？

接下来，我们就在这节课解决这些问题。

---

### 预备知识：Agent 的设计模式

生成回答这一步主要用的技术是 Agent 模式设计。Agent 设计中需要四大能力，即**记忆、工具使用、规划、反思能力**。这四项能力就像是大语言模型的外围设备，大语言模型只有在这些外围系统的支撑下，才能有更加可靠的发挥。

![](https://static001.geekbang.org/resource/image/8d/c0/8dd4276a5551fc9dbb90e159e151efc0.png?wh=1920x2749)

#### 1. 记忆能力

记忆能力用四象限图来表示：

![](https://static001.geekbang.org/resource/image/3a/3c/3a8b4721d4f57d69a9f9dcd4df54f93c.png?wh=4183x3917)

- **纵轴**：形式
  - 事实性记忆：是指客观发生的事实
  - 程序性记忆：是指主观形成的风格
- **横轴**：维持时长
  - 短期记忆
  - 长期记忆

通过 Hard Prompting（提示词工程）、Soft Prompting（微调）和 RAG 就可以构建起 Agent 的记忆能力。

#### 2. 工具使用能力与 Re-Act 设计模式

Re-Act 模式本质上就是一种提示词模板（思考、行动和观察），能够引导大语言模型通过不断地实践学习（行动和观察）与理论学习（思考）完成任务。

![](https://static001.geekbang.org/resource/image/be/8b/be2bf1988883213917a304e9d77f638b.png?wh=1842x1132)

Re-Act 的提示词模板：

```markdown
## Instruction
用思考、行动、观察交错的步骤解决问答任务。
- Search[entity]：在 Wikipedia 上搜索精确实体
- Lookup[keyword]：返回当前段落中包含关键字的下一个句子
- Finish[answer]：返回答案并完成任务
```

Agent 能根据行动反馈来随时改变决策。当 Agent 所处的"外界环境"有较强的不可预见性，且任务比较单一时，就可以采用这种设计方式。

#### 3. 规划能力与 Plan-and-Solve 模式

Plan-and-Solve 模式受 COT（让我们一步步来）启发，因为 COT 本身就是列出任务的每一步，约等于制定计划的过程。

![](https://static001.geekbang.org/resource/image/29/b1/299738308ed1e271dd9cdcec66d939b1.png?wh=1262x1180)

```markdown
给定一个任务，我们首先了解该任务并**制定完成任务的计划**。
然后，让我们执行该计划，您可以使用以下工具执行步骤：
- 搜索[您的关键字]
- 总结[内容]
- 完成[答案]
```

在执行计划的过程中，Agent 还可能需要重新计划，我们把这个过程称为 Replan，由 Replanner 来完成。

#### 4. 反思能力与 Reflection 模式

简单来说，反思能力就像老师检查作业。在 Checker 的提示词里，需要把总结内容、搜索结果、任务说明通通加上去：

![](https://static001.geekbang.org/resource/image/0b/c7/0bae6d4bdaec2b9ac58ce26ce20992c7.png?wh=1600x1069)

```markdown
给定一个任务，用户已经完成了该任务，
请你根据任务描述，任务完成情况，任务完成依据对任务进行检查，
并提供详细的建议，包括事实检查、核对数据正确性。
```

反思能有效地提高准确率，这能解决"生成回答后，发现的回答和检索结果内容不符"的问题。

---

### Agent 设计模式在企业级 AI 搜索中应用

根据分析，我们初步得出以下结论：

![](https://static001.geekbang.org/resource/image/4f/81/4fda52fa85d8d48a076d5685f0d0a281.png?wh=1920x936)

1. **知识问答（1）、词条搜索（3）、政策咨询（7）**：步骤会比较多，且不确定性比较高。更适合采用 **Plan-and-Solve 模式**，并加上一定的反思能力。
2. **内部生产数据问答（5）**：步骤不多，但不确定性比较高。比如在执行 SQL 的时候会出现执行失败，采用 **Re-Act 模式**会比较好。

![](https://static001.geekbang.org/resource/image/66/31/6679b714cd179d7d615647c01ff30e31.png?wh=1920x1060)
3. **文本数据提取（6）、文档合规审查（8）**：任务相对简单，环境确定，且有评判标准。可以加上**反思模式**即可。
4. **公共信息搜索（2）、资讯总结（4）**：确定性高，难度相对较低。可以直接使用。

---

### 小结

我们分别使用了 Re-Act，Plan-and-solve 和 Reflection 三种方式来增强 Agent 的工具使用、规划和反思能力，来应对不同的场景。

从 08 到 10 这三节课，我们经过了意图识别、Query 重写及路由、回答生成三个步骤，完成了企业级 AI 搜索这一产品的实战。

![](https://static001.geekbang.org/resource/image/67/50/6732cd09ba9d76c25434d0705d572c50.png?wh=1920x1124)

我们可以把企业 AI 搜索这个产品想象成一个善于倾听、表达、思维活跃的智者：

- 他首先会**倾听**你的想法（意图识别）
- 然后他**转述**成自己的语言（Query 重写）
- 最后，他拿到检索结果后，反复审视（ReAct），重新规划问题解决思路（Plan-and-Solve），并且在生成回答后还会再**核对**一下答案（反思）

### 课后题

在 08、09 节课，我们完成了个人私域 AI 搜索的意图识别、query 重写、路由，在 Coze、Dify 中的最后一步，大语言模型生成回答的时候，组合使用 ReAct 模式、Plan-and-Solve 模式、反思模式来回答问题。

你也可以尝试一个问题用 "ReAct 模式 + 反思模式" 和 "Plan-and-Solve 模式 + 反思模式" 来回答。看看到底哪种模式回答得更准确？

### 参考

![](https://static001.geekbang.org/resource/image/7c/82/7c88f90cc0f48c11fe45233ce4aa0a82.png?wh=1920x936)

- ReAct 论文（ReAct: Synergizing Reasoning and Acting in Language Models）
- Plan-and-Solve 论文
- Agent 九种设计模式

---

## 配图

| 序号 | 图片 |
|------|------|
| 图1 | ![](https://static001.geekbang.org/resource/image/07/4c/07abdec2a6634cd41d83af5ae695c84c.jpg) |
| 图2 | ![](https://static001.geekbang.org/resource/image/8d/c0/8dd4276a5551fc9dbb90e159e151efc0.png?wh=1920x2749) |
| 图3 | ![](https://static001.geekbang.org/resource/image/3a/3c/3a8b4721d4f57d69a9f9dcd4df54f93c.png?wh=4183x3917) |
| 图4 | ![](https://static001.geekbang.org/resource/image/be/8b/be2bf1988883213917a304e9d77f638b.png?wh=1842x1132) |
| 图5 | ![](https://static001.geekbang.org/resource/image/29/b1/299738308ed1e271dd9cdcec66d939b1.png?wh=1262x1180) |
| 图6 | ![](https://static001.geekbang.org/resource/image/0b/c7/0bae6d4bdaec2b9ac58ce26ce20992c7.png?wh=1600x1069) |
| 图7 | ![](https://static001.geekbang.org/resource/image/4f/81/4fda52fa85d8d48a076d5685f0d0a281.png?wh=1920x936) |
| 图8 | ![](https://static001.geekbang.org/resource/image/66/31/6679b714cd179d7d615647c01ff30e31.png?wh=1920x1060) |
| 图9 | ![](https://static001.geekbang.org/resource/image/67/50/6732cd09ba9d76c25434d0705d572c50.png?wh=1920x1124) |
| 图10 | ![](https://static001.geekbang.org/resource/image/7c/82/7c88f90cc0f48c11fe45233ce4aa0a82.png?wh=1920x936) |
| 图11 | ![](https://static001.geekbang.org/resource/image/b9/62/b9a9f36ddcb5f3c2b5f1f404a26faf62.png) |
