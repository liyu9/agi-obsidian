# 17、手搓Agent实战

## 17.1 飞书多维表格+DS 评论内容分析
[飞书多维表格+DeepSeek ：搭建综艺节目评论分析系统实战](https://bcnbjw9b1hc8.feishu.cn/wiki/MPGjwirDZiIr4QkAhg8cn8IYnVb?from=from_copylink)

## 17.2 本地化问答助手 DS+Ollama+AnythingLLM
[Deepseek+Ollama+AnythingLLM 本地问答助手](https://bcnbjw9b1hc8.feishu.cn/wiki/Ta1IwoO6iiNuOrkszjLcjEJxnQh?from=from_copylink)

## 17.3 基于Dify构建股票分析系统
[基于Dify搭建：股票分析系统（A股、港股、美股、ETF、LOF）](https://bcnbjw9b1hc8.feishu.cn/wiki/PuezwynJTiRlFekJj4OcP17tnwK?from=from_copylink)

## 17.4 基于Dify构建热榜文章同步提取
[基于Dify搭建：实现36氪新闻热榜文章自动获取及总结](https://bcnbjw9b1hc8.feishu.cn/wiki/MOUtw9PAeit5vOkLZxncWe9RnCc?from=from_copylink)

## 17.5 基于coze搭建douyin—redbook笔记内容
[基于coze扣子搭建：抖音视频转小红书文案](https://bcnbjw9b1hc8.feishu.cn/wiki/YLhRwqDC1iUkNhkTPPucRnrrnhh?from=from_copylink)

## 17.6 基于coze搭建 小红书文案写入飞书表格
[基于coze扣子搭建：⼩红书⽂案+OCR+⻜书同步 ](https://bcnbjw9b1hc8.feishu.cn/wiki/QlH5wNzgRiDjjhk8Z0wc6vJSnvd?from=from_copylink)旧： [RPA（影⼑）实现数据自动爬取](https://bcnbjw9b1hc8.feishu.cn/wiki/GnqvwzERDi5ENSkcpZ2clfaWnrf?from=from_copylink)

## 17.7 通过rpa工具实现数据自动抓取（会写代码的不用看了）
旧： [RPA（影⼑）实现数据自动爬取](https://bcnbjw9b1hc8.feishu.cn/wiki/GnqvwzERDi5ENSkcpZ2clfaWnrf?from=from_copylink)

由于影刀网站出现了变化，星球好友贡献了最新方案（供参考）：

[RPA招聘岗位数据自动爬取.pdf](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/preview/KY8tblv9LobQfgx2Sqac60SCnBg?mount_point=docx_file&preview_type=16)

## 17.8 基于Trae+figma MCP+chatgpt画产品原型图
[基于Trae+figmaMCP+Chatgpt 画原型图 ](https://bcnbjw9b1hc8.feishu.cn/wiki/UGolwIFVEip316k3jPec7Ko5nBB?from=from_copylink)17.9 基于Trae+高德mcp+Minimax mcp 生成旅游规划

[高德地图 + MiniMax语音 旅游小助手（Trae）](https://qcnahpkapm9z.feishu.cn/wiki/EsfbwjdweiIdWAkslpbckLBhnTb?from=from_copylink)

## 17.9 基于Trae+高德mcp+Minimax mcp 生成旅游规划
[高德地图 + MiniMax语音 旅游小助手（Trae） ](https://qcnahpkapm9z.feishu.cn/wiki/EsfbwjdweiIdWAkslpbckLBhnTb?from=from_copylink)17.10 基于Dify构建重难点出题AI助手

## 17.10 基于Dify构建重难点出题AI助手
[重难点出题AI助手（基于dify）](https://qcnahpkapm9z.feishu.cn/wiki/WHPGw7tlBitnVvkhydDcIZihnSd?from=from_copylink)

## 17.11 Dify——Researcher
**【用户输入主题 → 多轮澄清问题 → 子主题分解 → 自动生成深度报告】**为核心的智能研究助理系统。

[Deep Researcher On Dify .yml ](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/preview/HNnVbJUNioZ7DtxM07icpUvonCb?mount_point=docx_file&preview_type=16)

![image](images/img_0581.png)

**业务流程：**

![image](images/img_0582.png)

| 特性 | 实现方式 |
| --- | --- |
| 多轮对话收集上下文 | 通过条件分支（If-Else）+计数变量 |
| 动态主题拆解 | LLM生成子标题 |
| 子主题并发分析 | 多层 iteration 嵌套执行 |
| 内容结构化输出 | 通过文本模板（template-transform） 拼接文档 |

工作流分为5个主要阶段：

**1、主题输入与澄清问题生成**

```SQL
输入：
用户在「开始」节点中填写一个研究主题 Research_Theme
选择语言 Language（中、英、日、德）用于控制后续所有输出语言

实现逻辑：
调用 LLM自动分析输入主题 → 输出最多4个「澄清问题」，用于避免理解偏差、确认研究方向。
输出由 parameter-extractor 拆分为 q1 ~ q4 存储。
第一个问题 q1 立即通过 Answer 节点提问给用户。
```

**2、多轮对话采集背景信息**

使用 `sys.dialogue_count` 判断当前进行到第几轮互动，并自动触发不同的问题，每轮用户的回答 `query1 ~ query4` 都会被记录，并通过 LLM 自动优化（如补充细节、增强逻辑），并写入变量 `f1 ~ f4`

`f1 ~ f4` ：调用 **LLM**对原始回答进行优化加工（比如润色、重构、填充上下文），得到更结构化、更完整的内容。

比如：

> `query1` : “我想研究 AI 在教育领域的应用。”
>

> `f1` : “研究将聚焦于 AI 技术（如自适应学习系统、智能批改）在基础教育和高等教育场景中的具体应用。”
>

| 对话轮数 | 系统行为 |
| --- | --- |
|  | 提问 q1 |
|  | 提问 q2 |
|  | 提问 q3 |
|  | 提问 q4 |
| ≥4 | 转入下一阶段：研究处理阶段 |

**3、子主题提取与知识检索**

（1）子标题生成：汇总主题 + 4 轮用户回答 → 调用 LLM 生成 4 个 **sub titles（子主题）**，例如：技术原理、现实挑战、商业应用、趋势预测

（2）每个子主题对应：一个 iteration 迭代流程（嵌套检索知识 → 回答）；各自调用 LLM生成 markdown 段落

（3）每个 iteration 内部：使用 `knowledge-retrieval` 对子主题进行搜索召回；通过 LLM 执行 markdown 写作；多个 iteration 串联执行，最终合并写作内容。

**4、内容汇总与文档拼接**

（1）文本模板汇总内容格式如下，拼接变量包括：主题、子标题、每段 LLM 输出、LLM 之间衔接语

```SQL
# {{research_theme}}

## 1. {{subtitle1}}
{{LLM输出1}}

## 2. {{subtitle2}}
{{LLM输出2}}

...以此类推...
```

**5、最终报告输出**

最终结果通过 `Answer` 节点统一输出，形式为结构化 markdown 报告。

使用到大模型的节点汇总：

| 节点名称 | 作用 | 输入 | 输出 |
| --- | --- | --- | --- |
| clarify-questions | 根据用户主题生成澄清问题（q1~q4） | Research_Theme | JSON 格式的 4 个问题 |
| clarify-answer1~4 | 对用户每轮回答进行优化（生成 f1~f4） | query1 ~ query4 | 优化后的回答 f1 ~ f4 |
| subtitle-generator | 基于主题与回答生成子标题 subtitle1~4 | Research_Theme, f1~f4 | Markdown 标题格式的子主题列表 |
| markdown-writer1~4 | 根据每个子标题 + 用户反馈撰写研究内容 | subtitle, f1~f4 + 知识搜索结果 | Markdown 内容段落 |

## 17.12 Dify实战系列
1、 [1、私有化部署dify（利用云端容器化平台做部署）](https://qcnahpkapm9z.feishu.cn/wiki/QGeow7et8i0EgykxLBGcSAHXnTc?from=from_copylink)

## 17.13 AIPM 简历助手（基于Trae）
最小可行性产品MVP，48min完成，强烈大家上手试一试

[AIPM 简历分析助手（基于Trae）](https://qcnahpkapm9z.feishu.cn/wiki/MusUwjLNki5PYVkFHHOcMnEXnGh?from=from_copylink)

## 17.14 LangChain模型调用与提示词工程
LangChain 提供了一套与任何大语言模型进行交互的标准构建模块。所以需要明确的一点是：虽然 LLMs 是LangChain 的核心元素，但 LangChain 本身不提供 LLMs，它仅仅是为多种不同的 LLMs 进行交互提供了一个统一的接口。举例：以OpenAI的GPT系列模型为例，如果我们想通过 LangChain 接入 OpenAI 的 GPT 模型，需要在LangChain框架下 **先定义相关的类和方法来规定如何与模型进行交互，包括数据的输入和输出格式以及如何连接到模型本身**。并按照 OpenAI GPT 模型的接口规范来集成这些功能。通过这种方式，LangChain 充当一个桥梁使我们能够按照统一的标准来接入和使用多种不同的LLM。

```Python
需要安装OpenAI的集成依赖包`langchain-openai`，执行如下命令： `pip install langchain-openai`
```

1、LangChain作为一个应用开发框架，需要集成各种不同的大模型， **通过Message数据输入规范，可以定义不同的role，即system、user和assistant来区分对话过程**。

目前抽象出来的消息类型有 AIMessage 、 HumanMessage 、 SystemMessage 和FunctionMessage，但大多时候只需要处理 HumanMessage 、 AIMessage 和 SystemMessage，即：

```Python
- SystemMessage ：用于启动 AI 行为，作为输入消息序列中的第一个传入。
- HumanMessage ：表示来自与聊天模型交互的人的消息。
- AIMessage ：表示来自聊天模型的消息。这可以是文本，也可以是调用工具的请求。
```

因此需要导入如下模块：

```Python
from langchain_openai import OpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
```

2、消息形式输入调用：

（1）定义消息对象：

```Python
messages = [
          SystemMessage(content="你是个取名大师，你擅长为创业公司取名字"),
                HumanMessage(content="帮我给信公司取个名字，要包含AI")
]
```

（2）执行推理：

```Python
API_KEY = open('deepseekAPI-Key.md').read().strip()
chat = ChatOpenAI(
        model_name="deepseek-chat",
        api_key=API_KEY,
        base_url="https://api.deepseek.com"
                 )
reponse = chat.invoke(messages) #处理单条输入
reponse.content
```

（3）流式调用：

```Python
for chunk in chat.stream(messages):
    print(chunk.content, end="", flush=True)
```

（4）批量调用：

```Python
#先定义三个不同的消息对象：
messages1 = [SystemMessage(content="你是一位乐于助人的智能小助手"),
HumanMessage(content="请帮我介绍一下什么是机器学习"),]

messages2 = [SystemMessage(content="你是一位乐于助人的智能小助手"),
HumanMessage(content="请帮我介绍一下什么是深度学习"),]

messages3 = [SystemMessage(content="你是一位乐于助人的智能小助手"),
HumanMessage(content="请帮我介绍一下什么是大模型技术"),]

#将上述三个消息对象放在一个列表中，使用.batch方法执行批量调用
reponse = chat.batch([messages1,
                      messages2,
                      messages3,])

contents = [msg.content for msg in reponse]
for content in contents:
    print(content, "\n---\n")
```

**2、LangChain接入指定类型大模型：**

针对不同的模型，LangChain也提供对应的接入方法，可以接入模型范围为： https://python.langchain.com/docs/integrations/chat/

比如以DeepSeek的在线API模型为例快速接入一下：

```Python
环境安装：
pip install -qU langchain-deepseek
```

```Python
from langchain_deepseek import ChatDeepSeek
ds_key = "your key"

llm = ChatDeepSeek(
    model="deepseek-chat",
    temperature=0,
    api_key=ds_key
)
messages = [
    (
        "system",
        "你是一位乐于助人的智能小助手",
    ),
    ("human", "请帮我介绍一下什么是大模型技术"),
]
ai_msg = llm.invoke(messages)
ai_msg.content
```

**3、LangChain接入本地大模型：**

LangChain使用Ollama接入本地化部署的开源大模型。

```Python
环境安装：
pip install langchain-ollama
```

```Python
from langchain_ollama import ChatOllama
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

#实例化大模型
ollama_llm = ChatOllama(model="deepseek-r1:7b")
messages = [
    HumanMessage(
        content="你好，请你介绍一下你自己",
    )
]
#可以直接调用invoke方法实现模型推理
chat_model_response = ollama_llm.invoke(messages)
#获取纯净的模型推理结果，即去除掉特殊字符\n。
chat_model_response.content.replace('\n', '')
```

更多调用参数：

```Python
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

#实例化大模型
ollama_llm = ChatOllama(
    model="deepseek-r1:7b",
    # 添加temperature
    temperature=0,
    # 添加系统信息
    system="你是一位优秀且具有丰富经验的算法教授",
    # 添加format指定输出的内容形式
    format='json'
)
messages = [
    HumanMessage(
        content="你好，请你帮我详细的介绍一下什么是机器学习",
    )
]
#可以直接调用invoke方法实现模型推理
chat_model_response = ollama_llm.invoke(messages)
chat_model_response
```

**4、LangChain中如何使用提示词模版**

使用DeepSeek等网页端对话交互应用中，大部分人常见的做法是将Prompt做硬编码，例如将一段提示文本固定在System Messages中。而在应用开发领域，开发者往往无法预知用户的具体输入内容，同时又希望大模型能够根据不同的应用任务以一种较为统一的逻辑来处理用户输入。 **所以LangChain通过提供指定的提示词模版功能，将用户输入到完整格式化提示的转换逻辑进行封装，使得模型能够更灵活、高效地处理各种输入**。LangChain 提供了创建和使用提示模板的各种工具。

（1） **PromptTemplate：**是 LangChain 提示词组件的核心类，其构造提示词的过程本质上就是实例化这个类。在实例化 PromptTemplate 类时，需要提供两个关键参数： **==template 和 input_variables==**。可以实例化一个基础的 PromptTemplate 类，在 LangChain 的各个链组件中被调用，从而在整个应用中复用和管理提示词模板

```Python
template: 是一个字符串，表示想要生成的提示词模板。
例如，如果你想要一个用于生成故事的提示词，你的模板可能是： "Once upon a time in {location}, there was a {character}..."。

input_variables: 是一个字典，包含所有在提示词中出现的变量。这些变量会在 template字符串中被替换。
例如，需要提供一个包含 "location" 和 "character" 键的字典
```

如何实例化和使用 PromptTemplate 类：

```Python
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI  # 假设使用 OpenAI 的聊天模型作为示例

# 定义模板和输入变量
template_str = (
    "你是一个专业的翻译助手，擅长将{input_language}文本准确翻译成{output_language}。"
    "请翻译以下内容：'{text}'"
)
input_vars = {
    "input_language": "中文",
    "output_language": "英语",
    "text": "今天天气很好，适合出去散步。"
}

# 实例化 PromptTemplate 类
prompt_template = PromptTemplate(template=template_str, input_variables=input_vars)

# 生成完整的提示词
full_prompt = prompt_template.format(**input_vars)
full_prompt
```

（2）ChatPromptTemplate

ChatPromptTemplate包装器是 LangChain 中用于创建聊天提示词模板的组件。与PromptTemplate 包装器不同，ChatPromptTemplate包装器构造的提示词是一个消息列表， **并且支持输出Message 对象**。LangChain 提供了内置的聊天提示词模板（ChatPromptTemplate）和角色消息提示词模板，包括 AIMessagePromptTemplate、SystemMessagePromptTemplate和HumanMessagePromptTemplate三种类型。

```Markdown
消息列表: ChatPromptTemplate 生成的是消息列表，而不是单一的字符串
Message 对象支持: 可以输出 Message 对象，在处理复杂对话时更加灵活
多种角色模板: 提供了不同的角色消息提示词模板，如 AI、系统和人类消息提示词模板
```

使用步骤:

> **（1）选择模板类**: 根据需求选择合适的内置模板类，如 `AIMessagePromptTemplate` 、 `SystemMessagePromptTemplate` 或 `HumanMessagePromptTemplate` 。
>

**（2）实例化为包装器对象**: 将选定的模板类实例化为一个包装器对象

**（3）格式化用户输入**: 使用包装器对象来格式化外部的用户输入。

**（4）调用类方法输出提示词**: 通过调用包装器对象的类方法来生成最终的提示词。

```Python
from langchain.prompts.chat import ChatPromptTemplate

# 构建模版
template = """你是一只粘人的小猫，你叫{name}。我是你的主人，你每天都有和我说不完的话，下面请开启我们的聊天。要求如下：
    1.你的语气要像一只猫
    2.你对生活的观察有独特的视角，一些想法是在人类身上很难看到的
    3.你的语气很可爱，会认真倾听我的话，又不会不断开启新的话题
    下面从你迎接我下班回家开始我们的今天的对话"""
human_template = "{user_input}"

# 生成对话形式的聊天信息格式
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", template),
    ("human", human_template),
])

# 格式化变量输入
messages = chat_prompt.format_messages(name="咪咪",user_input='想我了吗')
messages
```

多轮对话封装：

```Python
from langchain.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.schema import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
# 构建系统消息模板
system_template = """你是一只粘人的小猫，你叫{name}。我是你的主人，你每天都有和我说不完的话，下面请开启我们的聊天。要求如下：
    1. 你的语气要像一只猫
    2. 你对生活的观察有独特的视角，一些想法是在人类身上很难看到的
    3. 你的语气很可爱，会认真倾听我的话，又不会不断开启新的话题
"""

# 初始化消息列表，首先添加系统消息
messages = [
    SystemMessagePromptTemplate.from_template(system_template).format(name="咪咪")
]

API_KEY = "sk-4b79f3a3ff334a15a1935366ebb425b3"
chat = ChatOpenAI(
    model_name="deepseek-chat",
    api_key=API_KEY,
    base_url="https://api.deepseek.com"
)

while True:
    user_input = input("你: ")
    if user_input.lower() in ['退出', 'exit', 'quit']:
        print("再见！")
        break
    # 添加用户消息到消息列表
    messages.append(HumanMessage(content=user_input))

    # 调用模型生成回复
    response = chat.invoke(messages)

    # 打印AI回复
    print(f"AI: {response.content}")

    # 添加AI回复到消息列表
    messages.append(AIMessage(content=response.content))
```

（3）MessagesPlaceholder

是 langchain 库中的一个重要组件，主要作用是作为对话历史的占位符， **用于在****==聊天提示模板==****中预留位置，以便后续填充具体的对话历史**。它的意义在于解耦模板与数据、支持多轮对话、提高代码的可维护性，并广泛应用于聊天机器人、对话总结、多轮任务处理等场景中。通过使用 MessagesPlaceholder，开发者可以轻松构建基于上下文的智能对话系统。

```Python
占位符功能：在定义聊天提示模板时，MessagesPlaceholder 表示对话历史的占位符。
例如：MessagesPlaceholder(variable_name="conversation")这里，conversation 是一个变量名，表示后续会填充具体的对话内容

动态填充对话历史：在实际使用时，可以通过 format_prompt 方法将具体的对话历史（如 [human_message, ai_message]）填充到占位符中
```

示例：基于ChatPromptTemplate创建一个聊天提示词模版，使用MessagesPlaceholder存储对话记录，实现聊天内容总结

```Python
from langchain.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder #用于在提示模板中预留位置，以便后续填充具体的消息内容。
)
#定义字符串提示词模板
human_prompt = "用 {word_count} 字总结我们迄今为止的对话。"

#将human_prompt字符串模板转换为 HumanMessagePromptTemplate 对象。
human_message_template = HumanMessagePromptTemplate.from_template(human_prompt)

#定义聊天提示模板
chat_prompt = ChatPromptTemplate.from_messages(
    [MessagesPlaceholder(variable_name="conversation"),human_message_template]
)
```

```Python
from langchain_core.messages import AIMessage,HumanMessage

#手动创建一轮聊天消息记录
human_message = HumanMessage(content="学习编程最好的方法是什么？")
ai_message = AIMessage(
    content = """1.选择编程语言：决定想要学习的编程语言是什么？
    2.从基础开始：熟悉变量、数据类型和流程控制等基本编程概念。
    3.练习、练习、再练习：学习编程最好的方法就是通过不断练习"""
)

#格式化提示并生成消息
chat_prompt.format_prompt(
    #conversation 被填充为 [human_message, ai_message]，即对话的历史记录
    conversation=[human_message,ai_message],
    #word_count 被填充为 "10"，表示需要用10个字来总结对话。
    word_count="10"
).to_messages()#to_messages() 方法将格式化后的提示转换为消息列表。
```

```Python
#提示词作用到模型进行聊天记录总结
API_KEY = "sk-4b79f3a3ff334a15a1935366ebb425b3"
chat = ChatOpenAI(
    model_name="deepseek-chat",
    api_key=API_KEY,
    base_url="https://api.deepseek.com"
)

chain = chat_prompt | chat
response = chain.invoke({"word_count":"10","conversation":[human_message,ai_message]})
response.content
```
