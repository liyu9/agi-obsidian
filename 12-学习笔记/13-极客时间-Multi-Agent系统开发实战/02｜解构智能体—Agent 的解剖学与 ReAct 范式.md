# 02｜解构智能体—Agent 的解剖学与 ReAct 范式

02｜解构智能体——
Agent 的解剖学与 ReAct 范式


会使用工具不断行动的“魔法师”？


代码1：CrewAI中的Agent实现 - 网络调研Agent
备注：代码中用阿里云的 QWenAPI 和百度的搜索组件替代了不容易访问的 OpenAI 和 Google 搜索
searcher = Agent(
role="网络调研专家",
goal="通过系统化的网络搜索和信息提取，完成用户指定的调研任务，并
生成结构化的Markdown格式调研报告",
backstory="""你擅长通过系统化的方法收集、分析和整理网络信息。你的
工作流程遵循以下步骤：
1、……
2、……
你始终遵循准确性、完整性和可追溯性的原则，确保每份报告都有可靠的
信息来源支撑。""",
tools=[ScrapeWebsiteTool(), BaiduSearchTool(), FileWriterTool()],
llm=aliyun_llm,
)
task = Task(
description="帮我调研极客时间的相关信息，并生成调研报告",
expected_output="结构化的调研报告，包括关键要点、证据和引用来源",
agent=searcher,
)
Info：Thought: │ 我需要首先理解用户的需求……，Using Tool: 百度搜索
Info：Observation: 找到 10 条搜索结果
Info：Thought: │我将访问极客时间的主站链接……，Using Tool: WebsiteTool
Info：Observation: 极客时间-学 AI ，用极客时间 
Info：Thought: │我需要进一步详细内容……，Using Tool: WebsiteTool
Info：Observation:极客邦科技
Info：Thought: │之前的网页抓取未能返回有效内容……，Using Tool: 百度搜索
Info：Observation:找到 10 条搜索结果
Info：Thought: │并准备撰写结构化调研报告……，Using Tool: 百度搜索
Info：Observation: 找到 5 条搜索结果
Info：Thought: │撰写最终报告保存文件……，Using Tool: File Writer 
Info：Observation: Content successfully written to ./极客时间调研报告.md 
Info：Thought: │ 我已经完成了任务……，Final Answer: ****
核心代码
执行日志


撕开外衣，看见“循环机器”
tools


显微镜——逐行解析 ReAct 日志
背景设置
任务明确
Thought
Action
Observation
Final Answer
遇到 Observation 为 stop
模型停止输出
遇到 Final Answer
工程提取参数，调用工具
工具结果写回 message，
再次调用模型
调用模型
拼 system prompt


核心prompt模版
You are {role}, {backstory}. Your personal goal is: {goal}. You ONLY have 
access to the following tools, and should NEVER make up tools that are not 
listed here:{tools schema}. 
IMPORTANT: Use the following format in your response
```
Thought: you should always think about what to do
Action: the action to take, only one name of {tools name list}, just the name, 
exactly as it's written.
Action Input: the input to the action, just a simple JSON object, enclosed in 
curly braces, using \" to wrap keys and values.
Observation: the result of the action
```
Once all necessary information is gathered, return the following format
```
Thought: I now know the final answer
Final Answer: the final answer to the original input question
``
Current Task: {description}. This is the expected criteria for your 
final answer: {expected_output}. 
you MUST return the actual complete content as the final answer, 
not a summary.
Begin! This is VERY important to you, use the tools available and 
give your best Final Answer, your job depends on it!
Thought:
Thought: {模型实际输出}
Action:{模型选择的工具}
Action Input:{模型提取的调用工具参数}
Observation:{工具返回的结果}
System prompt
User prompt
Assistant prompt


代码2：手搓 Agent——从原理到代码
备注：本次只是最核心逻辑的极简实现，实际工程上要考虑的问题非常多，后续需要十几节课时来专门学习


架构师视角——混合架构
工作流：✅ 稳定可靠  ❌ 处理不确定性或者异常
Agent：✅ 自主决策下一步  ❌ 可控性差，成本高
Thought
Action
Observation
不确定节点
不确定节点


下节提示：Multi-Agent系统——Agent、Task、Process 的协作美学
课程总结
Agent 理解：自主决策 + 行动 + 工具 + 记忆 
ReAct 的实现逻辑：Thought -> Action -> Observation -> Final Answer
•
本质是直到看见 Final Answer 的无限循环
•
依赖 Observation 作为 stop 信号实现模型和工程框架的衔接
•
Action 只输出工具名和参数，实际由框架执行工具调用
•
工具执行结果回写到原本上下文再次调用，不断拼接实现记忆
混合架构：合理结合 workflow 和 Agent


课后思考题
看上去非常完美的 ReAct 循环，想想实际上会有哪些坑？



---

**来源**：极客时间《Multi-Agent系统开发实战》第2讲

**提取日期**：2026-05-08
