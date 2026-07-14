# 14｜MCP协议

14｜MCP协议：标准化定义工具接口


MCP——Model Context Protocol


核心价值——生态复用与架构解耦


MCP服务的生态


代码实战 —— 实现邮件管理MCP服务


深度解析 —— MCP工具的注入


最佳实践与反模式
反模式
巨型MCP：
类似playwright，一个list返回21个工具13.7K token，
大大干扰上下文
粒度过细：
工具拆的过于原子，每个工具一套schema，且调用时
多次交互，浪费token
同步阻塞时间：
Streamhttp的长连接，重IO的操作同步进行，导致
长时间没有心跳，client超时断开
系统参数交给模型：
像用户身份等应该系统直接传递的参数，一定不要让
模型生成，有安全风险
最佳实践
状态控制：
MCP server做成无状态的，由client控制状态
幂等设计：
在网络不稳定的 SSE 模式下，支持 Client 
传入 request_id 以防止重试导致的操作重复
其余遵守工具设计的反模式和最佳实践


课程总结
下节提示：Skills：面向Agent的工具升级
MCP的价值和生态
实现MCP Client和MCP Server



---

**来源**：极客时间《Multi-Agent系统开发实战》第14讲

**提取日期**：2026-05-08
