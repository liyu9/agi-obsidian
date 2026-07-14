# 03｜Multi｜Agent 系统——Agent, Task, Process 的协作美学

03｜Multi-Agent 系统——
Agent, Task, Process 的协作美学


单 Agent 的崩溃——当“上下文”变成“垃圾场”
× 上下文长度爆炸
× 上下文内容污染
× 多指令挑战


Agent, Task, Process — 构建“数字化职能部门”
测试
研发
产品经理
Agent
Task
Process
子任务：项目测试
子任务：代码研发


代码1：构建一个团队完成网络调研 Agent
researcher = Agent(
role="深度研究专家",
goal="以根据给定的研究任务，规划完成任务需要的信息，并生成完成任务的
步骤和最终报告的大纲",
backstory="""……""",
tools=[],
          allow_delegation=False, # 不允许委托给其他agent
)
writer = Agent(
role="报告撰写研究员",
goal="可以根据完成任务的步骤和报告大纲，逐步进行研究，生成最终的
markdown格式报告文档并写入到文件中",
backstory=""" ……
1. **逐步进行研究**：你会根据研究任务的步骤进行研究，研究时你会生成网
络搜索给到网络搜索专家，并严格按照搜索结果的信息点撰写报告。每完成一个步
骤你会撰写大纲中对应的报告内容，增量添加的写入文件
2. **分步发给编辑审核**：每完成一个步骤的报告，你会将报告发给报告审核
编辑进行审核，并根据审核的修改意见，修改报告并覆盖文件
……
""",
tools=[FileWriterTool(), FileReadTool()],
          allow_delegation=True, # 允许委托给其他agent
)
searcher = Agent(
role="网络搜索专家"",
goal="通过系统化的网络搜索和信息提取，完成指定的调研任务，并生成
结构化的信息点列表",
backstory="""……""",
tools=[ScrapeWebsiteTool(), BaiduSearchTool()],
          allow_delegation=False, 
)
editor = Agent(
role="报告审核编辑",
goal="可以根据发给你的报告进行审核，返回审核意见",
backstory=""" ……""",
tools=[FileWriterTool(), FileReadTool()],
          allow_delegation= False,)
核心代码


代码1：构建一个团队完成网络调研 Agent
task_plan = Task(
description="帮我调研极客时间的相关信息，并生成完成任务的步骤和最终报
告的大纲",
expected_output="结构化的任务步骤和报告大纲，包括：1. 任务分析结果 2. 
需要调研的关键信息点 3. 完整的报告大纲结构",
agent=researcher,
)
task_write = Task(
description="根据深度研究专家生成的任务步骤和大纲，搜索相关信息并最终
产出研究报告。你需要：1. 委托网络搜索专家进行信息搜索 2. 根据搜索结果撰写报
告 3. 委托报告审核编辑进行审核 4. 根据审核意见修改报告",
expected_output="完整的Markdown格式研究报告，包含所有关键信息点、
引用来源链接，并经过审核编辑的最终版本",
agent=writer,
)
crew = Crew(
agents=[researcher, searcher, writer, editor],
tasks=[task_plan,task_write],
process=Process.sequential, #任务顺序执行
)
Info：Agent: 深度研究专家 Task: 帮我调研极客时间的相关信息，并生成完成任务的步骤
和最终报告的大纲
Info： Agent: 深度研究专家 Final Answer: 调研的信息XX，步骤XX，大纲：XX
Info： Agent: 报告撰写研究员 Task：根据深度研究专家生成的任务步骤和大纲，搜索相
关信息并最终产出研究报告……
Info： Agent: 报告撰写研究员 Delegate：网络搜索专家 Task：搜索基本信息
Info： Agent:网络搜索专家 Final Answer：1、什么是极客时间…，2、所属公司…
Info： Agent: 报告撰写研究员 Delegate：报告审核编辑 Task：审核xxx文件
Info： Agent:报告审核编辑 Final Answer：审核意见：XXX
Info： Agent: 报告撰写研究员 Tool Use：FileWriter：{修改后的报告子章节}
Info： Agent: 报告撰写研究员 Delegate：网络搜索专家 Task：搜索XXXX
……
Info： Agent: 报告撰写研究员 Tool Use：FileRead：{报告子章节}
Info： Agent: 报告撰写研究员 Tool Use：FileWriter ：{最终报告}
Info： Agent: 报告撰写研究员 Delegate：报告审核编辑 Task：审核最终报告Info： 
Agent:报告审核编辑 Final Answer：审核意见：XXX
Info： Agent: 报告撰写研究员 Tool Use：FileWriter ：{修改后的最终报告} Info： Info： 
Agent: 报告撰写研究员 ，Final Answer: 报告撰写完成
核心代码
执行日志


“Multi-Agent”与“Single-Agent”对比


思维升级——从面向过程到面向组织


下节提示：架构师的决断——选型矩阵与落地场景
课程总结
单 Agent 局限的本质：上下文挑战
Multi-Agent 的三要素：Agent , Task , Process
•
Agent：定义职责边界和构建能力
•
Task：明确目标，传递信息
•
Process： 组织协作模式
Multi-Agent 和 Agent 对比：时间&成本换效果&可靠性
设计转型：从面向过程到面向组织


课后思考题
如何对比 Multi-Agent 和 Single-Agent 的可靠性？



---

**来源**：极客时间《Multi-Agent系统开发实战》第3讲

**提取日期**：2026-05-08
