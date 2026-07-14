# MCP Server | 明道云

> 原文链接：https://help.mingdao.com/ai/mcp/

## 背景
随着 Agent 应用的迅速发展，开发者在工具的开发与集成过程中逐渐暴露出一些共性难题：
- 缺少统一标准导致效率受限
- 不同平台间需要反复适配，增加了人力与时间成本
- 社区开源工具参差不齐，高质量能力的维护和整合往往代价高昂

## MCP协议
**MCP（Model Context Protocol）** 正是在这样的背景下被提出。它由 Anthropic 发布，是当前业界领先的开放协议，目标是在大模型与外部数据源之间建立安全且一致的双向连接，从而解决工具实现方式碎片化、难以跨模型共享等问题。

MCP 就像是一个"通用插头"或者"USB 接口"，MCP协议制定了统一的规范，规定了应用向LLM传输数据的方式。任何模型只要兼容MCP协议，就能与所有支持MCP的应用交互。

## Agent概念
想象你家里有一位智能管家，你只需要提出需求，他就能帮你安排好一切事务。这就是 **Agent（智能体）** 的角色。

### 发展演进
"人类理解" → "模型理解（半自动）" → "模型直接执行（协议化）"

## APIfox MCP 和 HAP MCP

### 使用场景

| MCP类型 | 功能 | 应用场景 |
|---------|------|----------|
| APIfox MCP | 获取最新的 HAP 应用接口文档 | "让模型读文档、懂接口" |
| HAP MCP | 直接操作应用数据 | "让模型执行业务、调系统" |

## 配置步骤

### 1. 获取MCP URL
打开应用 → API文档 → MCP → 获取 url 用于下方配置

### 2. Cursor配置
1. 打开Cursor-首选项-Cursor Settings-MCP
2. Add new globle MCP server
3. 点击右上角插件，探索 Marketplace，搜索 MCP，找到 【MCP SSE / StreamableHTTP】，点击安装
4. 已安装插件中，找到 【MCP SSE / StreamableHTTP】
5. 示例配置：填入 MCP 配置，其中"hap-mcp" 可替换为任意名称，url 需填入应用中生成的 url

### 3. Windsurf配置
1. 点击右上角插件，探索 Marketplace，搜索 【Agent 策略（支持 MCP 工具）】，点击安装
2. 示例配置：填入 MCP 配置，其中"hap-mcp" 可替换为任意名称，url 需填入应用中生成的 url
3. 右下方点击 MCP Servers，完成配置
