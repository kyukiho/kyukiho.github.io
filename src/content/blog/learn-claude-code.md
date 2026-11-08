---
title: Learn-Claude-Code
date: 2026-07-17
description: 从 Agent Loop、工具调用、权限、Hook 到 Plan 模式、SubAgent、Skill、上下文压缩与 Memory，逐层拆解 Claude Code 的核心概念。
tags:
  - Agent开发
  - 技术
category: 技术
---

## 基础概念

最原始的 AI 概念是单对话的，即用户发送信息给大模型，大模型返回结果。

如：用户「帮我查一下 xx 文件」；模型返回 xx 文件内容；用户粘贴文件内容第二次询问……

**取缔用户的中间层，做自动化**，因此引入第一个概念，**Loop**。

### Agent Loop

本质为一个 **while 循环**，以**需要的工具调用为 0** 作停止条件。当大模型还需要工具调用的时候持续调用工具并把结果累积到消息列表，直到大模型停止工具调用。

引入第二个概念，**工具调用**。

### Tool Use

- 注册：用 **JSON schema** 告知模型 **name 和 description**
- 调用：定义具体的**实现函数**

工具调用是否有**安全性问题**？引入第三个概念，**权限判断**。

### Permission

1. 硬拒绝表：**硬编码拒绝信息**，命中则阻止
2. 定义规则：tools（**指定工具**）check（**检查条件**）message（**返回信息**），命中返回给用户等待审批

条件全在循环逻辑上，为**防止循环膨胀**，引入第四个概念，**Hook**。

### Hooks

**对比：前 & 后**

改造前（直接调用）：

```python
def agent_loop(messages):
    while True:
        # ... LLM call ...
        for block in response.content:
            if not check_permission(block):  # ← 直接调用
                # ... 拒绝逻辑 ...
            output = execute(block)
```

改造后（统一接口）：

```python
def agent_loop(messages):
    while True:
        # ... LLM call ...
        for block in response.content:
            blocked = trigger_hooks("PreToolUse", block)  # ← 只调用统一接口
            if blocked:
                # ... 拒绝逻辑 ...
            output = execute(block)
            trigger_hooks("PostToolUse", block, output)   # ← 只调用统一接口
```

Hook 的注册定义信息：

- 最小可用：**事件名** & **回调函数**（何时触发 & 执行什么）
- 生产级：加上优先级、开关、条件等等

```python
# 基础用法
register_hook("PreToolUse", permission_hook)
register_hook("PostToolUse", log_hook)

# 增强用法
register_hook(
    event="PreToolUse",
    callback=permission_hook,
    name="check_dangerous_tools",
    priority=100,  # 高优先级，先执行
    condition=lambda block: block["type"] == "tool_use",  # 只在工具调用时检查
    enabled=True,
)
```

## 升级概念

当需求的小任务较多，后期容易**遗忘初始任务**，需要一个**硬性的规划**，因此引入 **plan 模式**概念。

### TodoWrite（plan 模式）

加入 **todo_write 工具**和 **reminder 机制**：前者负责接受列表，包括任务 & 完成状态；后者加入计数器，保证 3 轮会话 LLM 没调用此工具就注入提醒。

当任务更庞大，需要拆分成子任务，并且由独立的 agent 运行以**保证上下文干净**，因此引入 **subAgent** 概念。

### subAgent

从操作系统的角度：开子进程。

1. **上下文隔离**，注入全新 message 列表
2. 只**回传结论**，不回传完整 message 列表
3. 无 task 工具，**不允许创建子 agent**
4. 同样走 PreToolUse hook，**权限不隔离**

当任务**所需知识更垂直**，无法全注入 system prompt，引入 **skill** 概念。

### skill

- 原本：知识全部注入 system prompt
- 现在：知识拆成 skill 列表（包括 name 和 description【什么场景下调用】）注入 system prompt，LLM 在遇到 description 描述的情况时调用 load_skill 工具，把具体的知识信息**作为工具调用的结果**注入上下文

**上下文窗口有限**，消息越积越多会触发 `prompt_too_long` 错误，引入**上下文压缩**概念。

### 上下文压缩

1. **裁掉无用的旧对话**（如超过 50 条只保留前 3 条后 47 条）
2. **旧工具结果占位**（如只保留近 3 条工具调用的内容，更久远的只保留占位符）
3. **大结果落盘**（返回结果过大的不占用上下文，只保留标记，需要时重新读取）
4. **LLM 全量摘要**（让模型自己总结关键信息并保留替换，完整对话仍保留写入文件，只是不进入当下推理参考）

压缩后容易丢失重要信息，引入 **memory** 概念。

### memory

定义：区别于上下文窗口，一层**不参与压缩、跨会话保留**的存储。

#### 结构概览

```plaintext
.memory/
    ├── MEMORY.md                   # 索引（常驻 SYSTEM，一行一个链接）
    ├── user-preference-tabs.md     # type: user     —— 你是谁
    ├── feedback-no-mock-db.md      # type: feedback —— 怎么做事
    ├── project-auth-rewrite.md     # type: project  —— 正在发生什么
    └── reference-pipeline-bug.md   # type: reference —— 东西在哪找
```

MEMORY.md（总索引）：

```markdown
- [user-preference-tabs](user-preference-tabs.md) — 用户偏好用 tab 缩进，不用空格
- [feedback-no-mock-db](feedback-no-mock-db.md) — 写测试时不要 mock 数据库，用真实测试库
- [project-auth-rewrite](project-auth-rewrite.md) — auth 模块重写是合规(GDPR)驱动，有 deadline
- [reference-pipeline-bug](reference-pipeline-bug.md) — 数据管道 bug 追踪在 Linear 的 INGEST 项目
```

【例】user-preference-tabs.md（元数据索引 & 正文内容）：

```markdown
---
name: user-preference-tabs
description: 用户偏好用 tab 缩进，不用空格
type: user
---

用户在写/改代码时，缩进一律使用 **tab**，不要用空格。

- **Why:** 与现有代码库风格保持一致。
- **How to apply:** 写文件或编辑文件时，缩进始终用 tab。
```

#### 工作流程

| 环节 | 概述 | 说明 |
| ---- | ---- | ---- |
| 存储 | 记忆落盘，更新目录 | 写**正文内容**，加**元数据索引**，写完扫描所有 .md 文件**写回 MEMORY.md** |
| 加载 | 记忆重新回到当前的对话 | 路径一：**读取 MEMORY.md**，让大模型知道有哪些记忆存在；路径二：根据元数据索引里的 **name & description 做筛选**，挑出与当前话题相关的记忆文件 |
| 提取 | 每轮结束后自动沉淀新记忆 | 当**一轮对话结束**时，读取最近若干消息，先**去重已有记忆**，再**抽取并写入** |
| 整理 | 低频去重合并，防止膨胀 | 判断**记忆文件数**是否需要整理，合并去重，回写更新索引 |

### System Prompt

当引入记忆、上下文压缩、技能加载等等概念时，我们的 system prompt 不应该再是硬编码的，而应是根据当前状态组装的。

目的：**命中 prompt cache**。

> 名词解释：prompt cache 指 LLM API 提供的能力——如果你连续两次请求的**前缀相同**，第二次可以**跳过重复部分的处理**，直接从缓存读取。

因此当 System Prompt 按照正确拼装顺序——把几乎**每轮都一样**的内容放在最前面（**基础指令、通用工具定义、memory 索引**），把会变化的部分放在后面（**本轮新启用的工具描述、刚注入的记忆内容、当前任务特定的上下文**），就能让 prompt cache 的前缀匹配最大化命中。

### 错误恢复

其中「输出截断」涉及的 `max_tokens` 即定义的模型输出长度：

```python
client.messages.create(
    model="claude-sonnet-4-5",
    messages=[...],       # 输入（上下文）
    max_tokens=8000       # 输出限制
)
```

| 模式 | 触发 | 恢复动作 | 详细解释 |
| ---- | ---- | -------- | -------- |
| 输出截断 | max_tokens | 升级 8K→64K / 续写提示 | 通过**升级 token** 给模型更多输出空间，且升级时不追加截断内容，从头重新生成；若还是不够，进入续写模式（追加截断内容 + 续写提示，最多 3 次） |
| 上下文超限 | prompt_too_long | reactive compact → 重试 | 在已经上下文超限报错的**事后进行压缩**（区别于 auto compact），通常比较激烈，仅一次（如只保留 5 条，依然超限则说明单条会话过长） |
| 临时故障 | 429 / 529 | 指数退避 + 抖动，连续 529 可**切换备用模型** | **指数退避**指**每次等待时间翻倍**，给服务器恢复时间；**抖动**指**加随机偏移**，避免所有客户端同时重试。连续多次 529 证明**主模型过载**，应：1. 清除所有 pending 消息和 tool 结果（避免重复执行）；2. **切换备用模型**；3. 给用户展示信息 |
