# MiroFish 实现原理文档

## 项目概述

**MiroFish** 是一个基于多智能体技术和群体智能的下一代 AI 预测引擎。它通过构建高保真的平行数字世界来模拟和预测未来走向。

### 核心理念

从真实世界提取"种子信息"（突发新闻、政策草案、金融信号或小说故事），自动构建数字平行世界。在这个空间中，数千个具有独立人格、长期记忆和行为逻辑的智能体自由交互、社会演化。用户可以从"上帝视角"注入变量，精准推演未来趋势。

**标语**："让未来在数字沙盒中预演，助决策在百次模拟后制胜"

---

## 技术架构

### 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Vue 3)                        │
│  Home → Process → MainView → SimulationView → ReportView   │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP API
┌─────────────────────────────────────────────────────────────┐
│                      后端层 (Flask)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Graph API    │  │ Simulation   │  │ Report API   │     │
│  │ /api/graph   │  │ /api/sim     │  │ /api/report  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      核心服务层                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ GraphBuilder     │  │ SimulationManager│               │
│  │ (Zep GraphRAG)   │  │ (OASIS 调度)     │               │
│  └──────────────────┘  └──────────────────┘               │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ ProfileGenerator │  │ ReportAgent      │               │
│  │ (Agent 人设)     │  │ (报告生成)       │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    外部依赖层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Zep Cloud    │  │ OASIS        │  │ OpenAI API   │     │
│  │ (记忆图谱)   │  │ (社交模拟)   │  │ (LLM)        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 2. 技术栈

**后端 (Python 3.11+)**
- **Flask**: Web 框架，端口 5001
- **OASIS** (camel-oasis 0.2.5): CAMEL-AI 团队开发的高性能社交媒体模拟框架，支持百万级智能体交互
- **camel-ai** (0.2.78): AI 智能体框架
- **Zep Cloud** (3.13.0): 记忆图谱和长期记忆管理
- **OpenAI SDK**: LLM 集成（支持任何 OpenAI 兼容 API）
- **PyMuPDF**: PDF 处理
- **Pydantic**: 数据验证

**前端 (Node.js 18+)**
- **Vue 3**: 渐进式 JavaScript 框架
- **Vue Router**: 客户端路由
- **Axios**: HTTP 客户端
- **D3.js**: 数据可视化
- **Vite**: 构建工具和开发服务器

---

## 核心实现原理

### 阶段 1: 图谱构建 (GraphRAG)

#### 1.1 本体生成 (Ontology Generation)

**文件**: `backend/app/services/ontology_generator.py`

**核心流程**:
```python
def generate_ontology(document_text: str) -> Dict[str, Any]:
    """
    使用 LLM 从文档中提取实体类型和关系类型

    输入: 原始文档文本
    输出: {
        "entity_types": [
            {
                "name": "Person",
                "description": "个人实体",
                "attributes": [
                    {"name": "age", "description": "年龄"}
                ]
            }
        ],
        "edge_types": [
            {
                "name": "knows",
                "description": "认识关系",
                "source_targets": [
                    {"source": "Person", "target": "Person"}
                ]
            }
        ]
    }
    """
```

**实现原理**:
1. 使用 LLM 分析文档内容
2. 提取关键实体类型（人物、组织、事件等）
3. 识别实体间的关系类型
4. 定义实体和关系的属性
5. 生成符合 Zep API 要求的本体结构

#### 1.2 图谱构建 (Graph Building)

**文件**: `backend/app/services/graph_builder.py`

**核心流程**:
```python
def build_graph_async(text: str, ontology: Dict) -> str:
    """
    异步构建 Zep 知识图谱

    步骤:
    1. 创建 Zep 图谱实例
    2. 设置本体定义
    3. 文本分块 (chunk_size=500, overlap=50)
    4. 分批发送到 Zep (batch_size=3)
    5. 等待 Zep 处理完成
    6. 返回图谱信息
    """
```

**关键技术点**:
- **动态类型创建**: 使用 Python `type()` 动态创建 Pydantic 模型
- **保留名称处理**: Zep 有保留字段（uuid, name 等），需要转换为安全名称
- **批量处理**: 避免单次请求过大，提高处理效率
- **异步任务**: 使用线程池处理长时间运行的任务

```python
# 动态创建实体类型
entity_class = type(
    entity_name,
    (EntityModel,),
    {
        "__doc__": description,
        "age": Field(description="年龄", default=None),
        "__annotations__": {"age": Optional[EntityText]}
    }
)
```

#### 1.3 记忆注入

**个体记忆**: 为每个实体注入个性化记忆
**集体记忆**: 注入共同的背景知识和事件

---

### 阶段 2: 环境配置

#### 2.1 实体过滤与读取

**文件**: `backend/app/services/zep_entity_reader.py`

**核心功能**:
```python
def filter_defined_entities(
    graph_id: str,
    defined_entity_types: List[str],
    enrich_with_edges: bool = True
) -> FilteredEntities:
    """
    从 Zep 图谱中读取并过滤实体

    1. 获取所有节点
    2. 按类型过滤
    3. 可选：获取每个实体的关系边
    4. 返回过滤后的实体列表
    """
```

**数据结构**:
```python
@dataclass
class ZepEntity:
    uuid: str
    name: str
    entity_type: str
    summary: Optional[str]
    labels: List[str]
    edges: List[ZepEdge]  # 关系边
```

#### 2.2 Agent Profile 生成

**文件**: `backend/app/services/oasis_profile_generator.py`

**核心流程**:
```python
def generate_profiles_from_entities(
    entities: List[ZepEntity],
    use_llm: bool = True,
    parallel_count: int = 3
) -> List[OasisAgentProfile]:
    """
    为每个实体生成 OASIS Agent Profile

    基础模式 (use_llm=False):
    - 直接使用实体名称和摘要

    LLM 增强模式 (use_llm=True):
    - 使用 Zep 检索获取实体的丰富上下文
    - 调用 LLM 生成详细人设
    - 并行生成 (parallel_count=3)
    - 实时保存到文件
    """
```

**Profile 结构**:
```python
@dataclass
class OasisAgentProfile:
    agent_id: int
    name: str
    bio: str  # 个人简介
    interests: List[str]  # 兴趣爱好
    personality_traits: List[str]  # 性格特征
    occupation: str  # 职业
    location: str  # 位置
```

**平台差异**:
- **Twitter**: 使用 CSV 格式，字段包括 user_id, name, bio
- **Reddit**: 使用 JSON 格式，字段更丰富

#### 2.3 模拟配置生成

**文件**: `backend/app/services/simulation_config_generator.py`

**核心功能**:
```python
def generate_config(
    simulation_requirement: str,
    document_text: str,
    entities: List[ZepEntity]
) -> SimulationParameters:
    """
    使用 LLM 智能生成模拟配置参数

    输入:
    - 模拟需求描述
    - 原始文档内容
    - 实体列表

    输出:
    - 时间配置 (总时长、每轮分钟数)
    - 活跃度配置 (发帖概率、互动概率)
    - Agent 配置 (每个 Agent 的个性化参数)
    """
```

**配置结构**:
```json
{
  "time_config": {
    "total_simulation_hours": 72,
    "minutes_per_round": 30,
    "start_hour": 8
  },
  "activity_config": {
    "post_probability": 0.3,
    "like_probability": 0.5,
    "comment_probability": 0.4
  },
  "agent_configs": [
    {
      "agent_id": 0,
      "name": "张三",
      "activity_level": "high",
      "post_frequency": 0.4
    }
  ]
}
```

---

### 阶段 3: 模拟运行

#### 3.1 模拟管理器

**文件**: `backend/app/services/simulation_manager.py`

**核心职责**:
1. 创建模拟实例
2. 准备模拟环境（调用上述所有服务）
3. 管理模拟状态
4. 提供模拟配置查询

**状态机**:
```
CREATED → PREPARING → READY → RUNNING → COMPLETED/STOPPED/FAILED
```

#### 3.2 模拟运行器

**文件**: `backend/app/services/simulation_runner.py`

**核心功能**:

##### 3.2.1 进程管理
```python
def start_simulation(
    simulation_id: str,
    platform: str = "parallel",  # twitter/reddit/parallel
    max_rounds: int = None
) -> SimulationRunState:
    """
    启动模拟进程

    1. 加载配置文件
    2. 创建子进程运行 OASIS 脚本
    3. 启动监控线程
    4. 实时解析动作日志
    """
```

**进程启动**:
```python
# 构建命令
cmd = [
    sys.executable,
    "scripts/run_parallel_simulation.py",
    "--config", config_path,
    "--max-rounds", str(max_rounds)
]

# 启动子进程
process = subprocess.Popen(
    cmd,
    cwd=sim_dir,
    stdout=log_file,
    stderr=subprocess.STDOUT,
    env={"PYTHONUTF8": "1"},  # Windows UTF-8 支持
    start_new_session=True  # 创建新进程组
)
```

##### 3.2.2 动作监控
```python
def _monitor_simulation(simulation_id: str):
    """
    监控线程：实时解析动作日志

    日志结构:
    - twitter/actions.jsonl  # Twitter 动作日志
    - reddit/actions.jsonl   # Reddit 动作日志
    - simulation.log         # 主进程日志

    每 2 秒读取一次新增的动作
    """
```

**动作日志格式**:
```json
{
  "round": 1,
  "timestamp": "2024-01-01T10:00:00",
  "agent_id": 0,
  "agent_name": "张三",
  "action_type": "CREATE_POST",
  "action_args": {
    "content": "今天天气真好！"
  },
  "result": "post_id_123",
  "success": true
}
```

**事件类型**:
```json
{
  "event_type": "round_end",
  "round": 1,
  "simulated_hours": 0.5
}

{
  "event_type": "simulation_end",
  "total_rounds": 144,
  "total_actions": 5000
}
```

##### 3.2.3 图谱记忆更新

**文件**: `backend/app/services/zep_graph_memory_updater.py`

**核心功能**:
```python
class ZepGraphMemoryManager:
    """
    将模拟中的 Agent 活动动态更新到 Zep 图谱

    功能:
    1. 监听动作日志
    2. 将动作转换为 Zep Episode
    3. 批量发送到 Zep
    4. 更新实体的长期记忆
    """
```

**更新流程**:
```
Agent 动作 → 转换为 Episode → 批量缓存 → 发送到 Zep → 更新图谱
```

##### 3.2.4 进程清理

**跨平台终止**:
```python
def _terminate_process(process: subprocess.Popen):
    """
    跨平台终止进程及其子进程

    Windows:
    - 使用 taskkill /T 终止进程树

    Unix:
    - 使用 os.killpg 终止进程组
    """
```

**清理时机**:
1. 用户手动停止
2. 模拟自然完成
3. 服务器关闭（信号处理）

---

### 阶段 4: 报告生成

#### 4.1 ReportAgent

**文件**: `backend/app/services/report_agent.py`

**核心架构**:
```python
class ReportAgent:
    """
    自主报告生成智能体

    特性:
    - 工具调用能力 (max 5 次)
    - 反思能力 (max 2 轮)
    - 深度交互能力
    """
```

**工具集**:
1. **search_entities**: 搜索图谱中的实体
2. **get_entity_details**: 获取实体详情
3. **search_actions**: 搜索模拟动作
4. **get_timeline**: 获取时间线
5. **get_agent_stats**: 获取 Agent 统计

**生成流程**:
```
用户需求 → 工具调用 → 数据收集 → 反思 → 再次调用 → 生成报告
```

---

### 阶段 5: 深度交互

#### 5.1 Interview 功能

**文件**: `backend/app/services/simulation_ipc.py`

**核心原理**:
```python
class SimulationIPCClient:
    """
    进程间通信客户端

    使用文件系统实现 IPC:
    - commands/  # 命令目录
    - responses/ # 响应目录
    """
```

**Interview 流程**:
```
1. 客户端写入命令文件
   commands/{uuid}.json

2. 模拟进程监听命令目录

3. 模拟进程执行 Interview
   - 调用 Agent 的 LLM
   - 获取 Agent 的回答

4. 模拟进程写入响应文件
   responses/{uuid}.json

5. 客户端读取响应
```

**命令格式**:
```json
{
  "command_type": "interview",
  "agent_id": 0,
  "prompt": "你对这次事件有什么看法？",
  "platform": "twitter",
  "timestamp": "2024-01-01T10:00:00"
}
```

**响应格式**:
```json
{
  "status": "completed",
  "result": {
    "agent_id": 0,
    "response": "我认为这次事件非常重要...",
    "platform": "twitter"
  },
  "timestamp": "2024-01-01T10:00:05"
}
```

#### 5.2 批量 Interview

```python
def interview_agents_batch(
    simulation_id: str,
    interviews: List[Dict],
    timeout: float = 120.0
) -> Dict:
    """
    批量采访多个 Agent

    支持:
    - 不同 Agent 不同问题
    - 指定平台
    - 并行执行
    """
```

---

## 关键技术细节

### 1. 双平台并行模拟

**实现原理**:
```python
# 启动两个独立的 OASIS 环境
twitter_env = TwitterEnv(config)
reddit_env = RedditEnv(config)

# 并行运行
with ThreadPoolExecutor(max_workers=2) as executor:
    twitter_future = executor.submit(run_twitter, twitter_env)
    reddit_future = executor.submit(run_reddit, reddit_env)

    # 等待两个平台都完成
    twitter_future.result()
    reddit_future.result()
```

**日志隔离**:
- `twitter/actions.jsonl`: Twitter 平台动作
- `reddit/actions.jsonl`: Reddit 平台动作
- 前端可以分别展示两个平台的进度

### 2. 实时进度监控

**轮询机制**:
```python
# 前端每 2 秒轮询一次
GET /api/simulation/{id}/status

# 返回实时状态
{
  "current_round": 10,
  "total_rounds": 144,
  "twitter_actions_count": 500,
  "reddit_actions_count": 300,
  "recent_actions": [...]
}
```

### 3. 内存优化

**最近动作限制**:
```python
class SimulationRunState:
    recent_actions: List[AgentAction] = []
    max_recent_actions: int = 50  # 只保留最近 50 条
```

**分页查询**:
```python
GET /api/simulation/{id}/actions?limit=100&offset=0
```

### 4. 错误处理

**进程异常**:
```python
try:
    process.wait()
except Exception as e:
    state.runner_status = RunnerStatus.FAILED
    state.error = str(e)
    # 读取日志文件获取详细错误
```

**超时处理**:
```python
def interview_agent(timeout: float = 60.0):
    start_time = time.time()
    while time.time() - start_time < timeout:
        if response_exists():
            return read_response()
        time.sleep(0.5)
    raise TimeoutError("Interview 超时")
```

### 5. 资源清理

**信号处理**:
```python
def cleanup_handler(signum, frame):
    """
    捕获 SIGTERM, SIGINT, SIGHUP
    清理所有运行中的模拟进程
    """
    for sim_id, process in processes.items():
        terminate_process(process)
    sys.exit(0)

signal.signal(signal.SIGTERM, cleanup_handler)
signal.signal(signal.SIGINT, cleanup_handler)
```

**atexit 备用**:
```python
atexit.register(cleanup_all_simulations)
```

---

## 数据流图

### 完整数据流

```
用户上传文档
    ↓
生成本体 (LLM)
    ↓
构建 Zep 图谱
    ↓
读取实体
    ↓
生成 Agent Profile (LLM + Zep 检索)
    ↓
生成模拟配置 (LLM)
    ↓
启动 OASIS 模拟
    ↓
实时监控动作日志
    ↓
(可选) 更新 Zep 图谱
    ↓
模拟完成
    ↓
生成报告 (ReportAgent + 工具调用)
    ↓
深度交互 (Interview)
```

---

## 性能优化

### 1. 并行处理

**Profile 生成**:
```python
# 并行生成 3 个 Profile
with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [
        executor.submit(generate_profile, entity)
        for entity in entities
    ]
```

**批量 Interview**:
```python
# 一次性发送多个 Interview 命令
# 模拟进程并行处理
```

### 2. 实时保存

**增量写入**:
```python
# 每生成一个 Profile 立即保存
with open(output_path, 'a') as f:
    json.dump(profile, f)
    f.write('\n')
```

### 3. 缓存机制

**图谱信息缓存**:
```python
_graph_cache: Dict[str, GraphInfo] = {}
```

**状态缓存**:
```python
_run_states: Dict[str, SimulationRunState] = {}
```

---

## 安全性考虑

### 1. 进程隔离

- 每个模拟运行在独立的子进程中
- 使用 `start_new_session=True` 创建新进程组
- 防止进程泄漏

### 2. 文件权限

- 模拟数据存储在独立目录
- 使用 UUID 作为目录名，防止冲突

### 3. 超时保护

- 所有 LLM 调用都有超时限制
- Interview 有超时机制
- 防止无限等待

---

## 扩展性设计

### 1. 平台扩展

当前支持 Twitter 和 Reddit，可以轻松扩展到其他平台：

```python
# 添加新平台
class WeiboEnv(SocialMediaEnv):
    def __init__(self, config):
        super().__init__(config)
        self.platform_name = "weibo"

    def get_actions(self):
        return ["CREATE_POST", "REPOST", "COMMENT", "LIKE"]
```

### 2. 工具扩展

为 ReportAgent 添加新工具：

```python
@tool
def analyze_sentiment(text: str) -> Dict:
    """分析文本情感"""
    return sentiment_analyzer.analyze(text)
```

### 3. 存储扩展

当前使用文件系统，可以扩展到数据库：

```python
class DatabaseStorage:
    def save_state(self, state):
        db.session.add(state)
        db.session.commit()
```

---

## 总结

MiroFish 通过以下核心技术实现了高保真的社交模拟：

1. **GraphRAG**: 使用 Zep Cloud 构建知识图谱，提供丰富的上下文
2. **OASIS**: 高性能社交媒体模拟框架，支持百万级智能体
3. **LLM 增强**: 在关键环节使用 LLM 生成高质量内容
4. **实时监控**: 通过日志解析实现实时进度监控
5. **深度交互**: 通过 IPC 机制实现与模拟中 Agent 的实时对话

整个系统设计遵循模块化、可扩展、高性能的原则，为用户提供了一个强大的未来预测工具。
