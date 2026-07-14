# 23｜Orchestrator范式：任务层的主 Agent + 子 Agent

23｜Orchestrator范式
任务层的主 Agent + 子 Agent


单Agent的瓶颈：效果、性能、成本三重崩


从 Pipeline 到 Orchestrator：工程实践的收敛答案


主 Agent 委派，子 Agent 执行，文件路径回传


隔离·并发·验收：三把钥匙解开单 Agent 三堵墙


代码实战：用Orchestrator完成全栈开发工作


最佳实践与反模式
反模式
无 kill switch，失控账单
无预算上限 + 无终止条件，Agent 循环调用直到配额耗尽。
HackerNews 真实案例：$600 账单，零有效产出
主 Agent 规划失误，全链放大错误：
主 Agent 规划阶段出错，每个子 Agent 都在执行错误前提下
的任务，错误逐级放大
并行写任务冲突，产物无法调和：
Cognition/Devin 工程博客：共享规范必须在并发前确定，不
能边跑边对齐
AP-4  平铺 Agent 堆，误差 17 倍放大：
Google DeepMind 研究：层级结构是误差控制的工程必需
最佳实践
独立验收 Agent，执行和评审分离：
执行者带执行包袱，不客观；独立评审才能真正把关
先跑单 Agent，有需求再扩：
HackerNews 工程社区共识：从单 Agent 跑通，证明
有并发收益再拆，而不是一开始就多 Agent
每步可靠性必须 ≥99% ：
Galileo 数学推导：可靠性是指数衰减，每个子 Agent 
的稳健性直接决定系统上限。
显式传递上下文，无隐式共享：
Anthropic 案例：同一任务三个子 Agent，重复调查
了同一个 bug，不能假设 Agent 间自动知晓


课程总结
下节提示：认知升级——从任务列表到数字团队
Orchestrator 是业界实践的收敛答案
主 agent + n * 子agent
通过结构化的文件进行交互



---

**来源**：极客时间《Multi-Agent系统开发实战》第23讲

**提取日期**：2026-05-08
