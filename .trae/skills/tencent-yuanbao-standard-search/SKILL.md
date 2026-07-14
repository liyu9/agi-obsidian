---
name: "tencent-yuanbao-standard-search"
description: "Search the web using Tencent Yuanbao (腾讯元宝) standard search API. Use when the user needs web search with Chinese content optimization, real-time information, or when other search engines return poor results for Chinese-language queries."
---

# Tencent Yuanbao Standard Search

Search the web using Tencent Yuanbao's standard search API, optimized for Chinese-language content.

## When to Use

Use this skill when:

- the user needs web search with Chinese content optimization
- other search engines return poor results for Chinese-language queries
- the user explicitly asks to use Yuanbao/元宝 for search
- real-time information from Chinese sources is needed

## How It Works

This skill invokes the Tencent Yuanbao standard search endpoint to retrieve web results. It is designed as a drop-in replacement for general web search when Chinese content quality matters.

## Search Process

1. Receive the search query from the user or agent
2. Call the Yuanbao standard search API with the query
3. Return structured results including titles, URLs, and snippets
4. For complex queries, break them into focused sub-queries

## Query Guidelines

- For Chinese queries, use natural Chinese phrasing
- For technical queries, prefer Chinese technical terms
- For comparison queries, structure as "A vs B" or "A 对比 B"
- For real-time data, include time indicators like "最新" or "今天"

## Output Format

Results include:

- title: page title
- url: source URL
- snippet: brief description or excerpt
- source: source site name (when available)

## Limitations

- Rate limits may apply
- Some international content may have limited coverage
- Results are optimized for Chinese-language content

## API Reference

The skill uses the Yuanbao standard search mode which provides:

- General web search
- News search
- Chinese content optimization
- Real-time result availability
