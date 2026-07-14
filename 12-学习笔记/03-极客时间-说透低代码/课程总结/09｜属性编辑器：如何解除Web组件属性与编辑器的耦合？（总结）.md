# 09｜属性编辑器：如何解除Web组件属性与编辑器的耦合？

> **核心成果**：通过编译器协议层 + OOP 抽象，解除编辑器、代码生成器和组件三者之间的耦合，并实现低代码平台的第一个插件——**业务组件**。

---

## 一、问题：编译器如何"学会"使用组件？

人类通过阅读 API 文档学习组件用法，但编译器没有智能。需要给编译器一份"教材"，要求：

| 特征 | 说明 |
|------|------|
| **结构化** | 代码擅长处理结构化数据 |
| **指令式** | 指出"怎么做"，而非"做成啥"（描述性） |

---

## 二、"教材"的演进过程

### 2.1 第一版：描述性（人类 API 文档）

```html
<jigsaw-table [data]="tableData"></jigsaw-table>
```

→ 完全是描述性的，告诉读者"做成啥"，对编译器不友好。

### 2.2 第二版：函数式（结构化 + 指令式）

```javascript
{
  html: function() { return `<jigsaw-table [data]="tableData">...`; },
  script: function() { return `const tableData = new TableData(); ...`; }
}
```

→ 问题：`data` 属性写死在 HTML 函数中，其他组件不一定有 data 属性，其他属性也无法处理。

### 2.3 第三版：属性独立为函数

```javascript
{
  html: function() { const properties = this.properties(); return `<jigsaw-table ${properties}>...`; },
  properties: function() { return `[data]="tableData"`; },
  script: function() { ... }
}
```

→ 问题：`properties` 身兼数职（生成 HTML 属性 + 生成脚本），职责不清。

### 2.4 第四版：Property 升级为类

```typescript
class Property {
  name = ''; value = ''; member = 'tableData';
  property() { return `[${this.name}]="${member}"`; }
  script() { return `const ${member} = new TableData(); ...`; }
}
```

SVD 类管理多个 Property：

```typescript
class SVD {
  properties: Property[];
  selector = '';
  html() { const prop = this.properties.map(p => p.property()).join(' '); return `<${this.selector} ${prop}>...`; }
  script() { return this.properties.map(p => p.script()).join('\n'); }
}
```

### 2.5 第五版：Property 抽象为基类 + 子类

组件有多个不同属性（如 data、columns），一个 Property 类无法描述 → 派生子类：

```typescript
abstract class Property {
  abstract script(): string;   // 基类不知道如何实现，只有声明
  name: string = ''; value: string = ''; member: string = '';
  property(): string { ... }
}
class DataProperty extends Property { script() { /* 具体实现 */ } }
class ColumnsProperty extends Property { script() { /* 具体实现 */ } }
```

### 2.6 第六版：SVD 也抽象为基类 + 子类

```typescript
abstract class SVD {
  abstract script(): string;
  properties: Property[]; selector: string = '';
  html(): string { ... }
}
class JigsawTable extends SVD {
  properties = [new DataProperty(), new ColumnsProperty()];
  selector = 'jigsaw-table';
  script() { ... }
}
class JigsawSelect extends SVD {
  properties = [new DataProperty(), new ValueProperty()];
  selector = 'jigsaw-select';
  script() { ... }
}
```

---

## 三、编译器 SDK 与插件机制

### 3.1 架构层次

```
抽象层（协议层）         实现层（组件教材）
┌─────────────┐         ┌──────────────────┐
│ Property    │ ←继承── │ DataProperty     │
│ (abstract)  │         │ ColumnsProperty  │
│ SVD         │ ←继承── │ JigsawTable      │
│ (abstract)  │         │ JigsawSelect     │
└─────────────┘         └──────────────────┘
     ↑                        ↑
  编译器 SDK               组件教材包
  (npm 包)               (npm 包)
```

### 3.2 编译器协议

- **协议 = 抽象基类中所有 API 的定义**
- 协议层只有一部分实现（基类的通用方法），另一部分只有声明（abstract 方法）
- 代码生成器基于这份完整的 API 描述编写 → 可正确编译
- 缺失的具体实现由**平台团队**（内置组件）和**业务团队**（自定义组件）分别补齐

### 3.3 SDK 组成

| 模块 | 形式 | 职责 |
|------|------|------|
| 编译器协议（SDK） | npm 包 | 提供 Property / SVD 抽象基类 |
| 组件教材 | npm 包 | 各组件的具体子类，调用工厂 register 登记教材 |
| 组件集 | npm 包 | 实际 UI 组件库 |
| 编辑器 | 平台内 | 收集编排结果，驱动代码生成 |
| 代码生成器 | 平台内 | 从工厂获取教材实例，执行生成代码 |

### 3.4 教材工厂（MetadataFactory）

```typescript
class MetadataFactory {
  register(selector: string, component: Type<SVD>): void;  // 登记组件教材
  getMetadata(selector: string, rawSvd: object): Type<SVD>; // 获取组件教材类
}
```

- 用组件的 **selector** 作为唯一身份标识
- 各组件教材调用 `register` 在工厂中登记

---

## 四、解耦效果

### 4.1 三者关系

```
编辑器 ←×→ 代码生成器 ←×→ 组件（集）
    ↓           ↓
  编译器协议（SDK）
```

- 编辑器与组件之间**无任何关系**，甚至连间接依赖都不存在
- 编辑器的所见即所得功能实时渲染组件，但代码结构上两者完全隔离

### 4.2 插件架构

```
┌─ 内置组件集（左侧绿色框）── selector + 教材子类 ─┐
│                                                    │  架构上平起平坐
└─ 业务组件插件（右侧红色框）── selector + 教材子类 ─┘
```

- 内置组件和插件组件结构一致 → **插件不低人一等**
- 业务团队可封装适合内部使用的业务组件纳入平台 → 大幅降低推广阻力

---

## 五、关键认知

1. **抽象层 + 实现层分离**是解除耦合的核心手段：基类定义流程，子类填充细节
2. **编译器协议 = 完整的 API 定义**，代码生成器只依赖这份定义，不依赖具体组件
3. **这是专栏的第一个插件实现**：业务组件通过 SDK 继承基类、注册教材 → 编辑器无耦合地生成和渲染业务组件
4. **首次实现业务团队定制通道**：通用型低代码平台必须支持业务团队扩展组件

---
来源：极客时间《说透低代码》第09讲
链接：https://time.geekbang.org/column/article/501746
日期：2026-05-18
