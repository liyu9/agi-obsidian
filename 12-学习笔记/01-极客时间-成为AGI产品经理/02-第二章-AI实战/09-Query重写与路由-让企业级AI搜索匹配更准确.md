# 09｜Query重写与路由：让企业级AI搜索匹配更准确

> 来源：极客时间《成为 AGI 产品经理》
> 作者：产品二姐
> 讲述时长：12:24

---

## 目录

- [正文](#正文)
- [配图](#配图)

---

## 正文

你好，我是产品二姐。

接着上节课的意图识别，今天来讨论企业 AI 搜索中的 Query 重写和 Query 路由。

---

### 企业 AI 搜索中的 Query 重写

看字面意思，Query 重写就是把用户的输入换一种说法来写。为什么要这么做呢？AI 搜索本质上是一个复杂 RAG 系统，而 Query 重写的目的就是增加 RAG 中 Retrieval 命中的几率。

![](https://static001.geekbang.org/resource/image/fa/d5/fa9428966174d70a24c0c60f306cded5.png?wh=1920x2930)

Query 重写有两个思路：

1. 让 Query 能更大程度地切中关键词，以适应关键词检索。
2. 让 Query 能更大程度地贴近被检索知识库中的文本块向量，以适应向量检索。

和意图识别一样，我们也可以使用大语言模型来做 Query 重写。Query 重写有不同的策略，每个策略对应不同的提示词，今天主要介绍**五种常见策略**：

![](https://static001.geekbang.org/resource/image/43/68/43b12a11d9eb99458b5d4b3f9e7b5168.png?wh=1920x1080)

1. 相同语义重写
2. 样本提示同义重写
3. 抽象化重写
4. 拆解任务重写
5. Hyde 重写（有假设答案重写）

#### 策略 1：同义重写

同义重写就是将用户的 Query 进行同义词转换。比如当用户询问"如何办理入职"时，可以改写为：入职手续如何办理、如何完成入职流程、如何进行入职手续、新人必读。

```markdown
## Task：
根据给定问题，生成多个具有相同含义的表述，表述中可以有一样的词语，但不能完全一致，不要重复输出。返回5个不同版本。
```

#### 策略 2：样本提示同义重写

少量样本提示重写就是增强版的"同义重写"，在同义转写的提示词中给出例子，使得同义转写更加准确。

#### 策略 3：抽象化重写

这类方法的英文名叫 step-back 重写，是指从具体到抽象。比如用户问："张三今天入职，他已经办完人事部门的手续，行政部门手续，还需要办什么手续？"

![](https://static001.geekbang.org/resource/image/f6/24/f63435b26094f72b148ff4defde60224.png?wh=1916x308)

可以改写为："公司的入职流程中，办完人事和行政手续后，还需要办什么手续？"

将实例抽象化的好处是可以增加检索成功的概率，因为改写之后，"张三"这个词不会出现在被检索知识库中。

#### 策略 4：拆解任务重写

也就是将用户的输入拆成多条搜索 Query，比如当用户问"山东和陕西两省最近有什么能源类的新闻"，就可以拆解为"山东省最近有什么能源类的新闻" 和"陕西省最近有什么能源类的新闻"。

#### 策略 5：HyDE重写（有假设答案重写）

HyDE 的全称是 Hypothetical Document Embeddings，意思是检索前先把用户问题发给大语言模型，让大语言模型给出答案，然后将用户的问题和答案一起作为 Query 进行检索。

这个方法一般用在通用的词条搜索，比如用户搜索"什么是辛普森悖论"，大语言模型会输出一段文字，然后将这段文字一起作为 Query 进行检索。

---

### 企业 AI 搜索中的 Query 路由

Query 路由简单来说就是为 Query 找到正确的数据源。Query 路由具体就是做三件事：

![](https://static001.geekbang.org/resource/image/db/18/db979fd2fb0f6201252ca91954482518.png?wh=1908x1110)

1. **定义数据源分类**
2. **定义数据源的检索方法**
3. **定义路由规则**

#### 定义数据源分类

数据源的分类可从多个维度来分，同时可以参考意图识别的分类。

#### 定义数据源的检索方法

检索有很多种方法：

![](https://static001.geekbang.org/resource/image/c2/4c/c25bcd3012858bb9ebff332dd981f44c.png?wh=1278x1168)

- **向量库检索**：比如本章第一个案例《智能说明书》中提到的向量检索。
- **指定文本信息提取**：在《文本数据提取助手》里提到了在指定文本里找到对应的信息。
- **公共搜索引擎**：比如在 Google 官方提供的搜索接口中，可以指定搜索的网站范围。
- **数据库搜索**：比如用户询问"今天在 xx 设备的总共产量是多少"，这时候可能需要调用生产数据库来查询。

#### 定义路由规则

前两步准备好数据源和检索方法后，第三步就是定义"什么问题要去查哪个或者那几个数据源"。

![](https://static001.geekbang.org/resource/image/5d/a6/5dbcd535c67ec725f07fbfaa5bc544a6.png?wh=1920x1204)最简单的方法就是用大语言模型来解决：

![](https://static001.geekbang.org/resource/image/37/dd/378763e0a723924cdb2yy7603a272fdd.png?wh=1664x778)

```markdown
## Task
给你一个用户的查询问题，从以下内容中选择可能从中检索到问题答案的数据源。

## 数据源
[
  {
     "Routername":"QueryDatabase",
     "RouterDescription": "企业内部的数据库或应用系统",
     "用户查询举例": ["5月份的总销量是多少", "今年2月的生产量是多少"]
   }
]
```

---

### 小结

Query 重写是对搜索发起方的输入进行打磨，让 Query 更容易匹配到正确的内容。

Query 路由是对被搜索对象进打磨，让搜索对象更容易被检索到。

在 Query 重写部分，产品经理需要针对各种 Query 采用合适的重写方法，使得改写后的 Query 比原有 Query 更精准地检索到正确内容。

在 Query 路由部分，产品经理需要从不同维度梳理数据源，使得用户的 Query 能被更准确地分发到合适的数据源。

### 课后题

我们接着上一节课的作业说说这节课的任务。上节课，你给自己的问题做了意图分类。接下来，请你对自己的问题做好分类，确定每种类别做合适的 Query 重写方法。之后将自己的知识库按工作、生活、学习这几个种类（或者其他维度）分类，建好知识库，然后做一个简单的 Query 路由，试着将你的问题路由到不同知识库进行回答。

---

## 配图

| 序号 | 图片 |
|------|------|
| 图1 | ![](https://static001.geekbang.org/resource/image/cc/6b/cc6879abec4da58007ca28695bfca66b.jpg) |
| 图2 | ![](https://static001.geekbang.org/resource/image/fa/d5/fa9428966174d70a24c0c60f306cded5.png?wh=1920x2930) |
| 图3 | ![](https://static001.geekbang.org/resource/image/f6/24/f63435b26094f72b148ff4defde60224.png?wh=1916x308) |
| 图4 | ![](https://static001.geekbang.org/resource/image/db/18/db979fd2fb0f6201252ca91954482518.png?wh=1908x1110) |
| 图5 | ![](https://static001.geekbang.org/resource/image/c2/4c/c25bcd3012858bb9ebff332dd981f44c.png?wh=1278x1168) |
| 图6 | ![](https://static001.geekbang.org/resource/image/37/dd/378763e0a723924cdb2yy7603a272fdd.png?wh=1664x778) |
| 图7 | ![](https://static001.geekbang.org/resource/image/43/68/43b12a11d9eb99458b5d4b3f9e7b5168.png?wh=1920x1080) |
| 图8 | ![](https://static001.geekbang.org/resource/image/5d/a6/5dbcd535c67ec725f07fbfaa5bc544a6.png?wh=1920x1204) |
| 图9 | ![](https://static001.geekbang.org/resource/image/b9/62/b9a9f36ddcb5f3c2b5f1f404a26faf62.png) |
