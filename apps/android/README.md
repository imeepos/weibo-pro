# 微博舆情 Android 原生应用

基于 Kotlin + Jetpack Compose + Clean Architecture 构建的现代化 Android 应用。

## 技术栈

### 核心框架
- **Kotlin** 1.9.20 - 现代化 Android 开发语言
- **Jetpack Compose** - 声明式 UI 框架
- **Hilt** - Google 官方依赖注入框架

### 架构组件
- **Clean Architecture** - 分层架构设计
- **Repository Pattern** - 数据仓储模式
- **UseCase Pattern** - 用例驱动业务逻辑

### 数据层
- **Retrofit** - REST API 客户端
- **OkHttp** - HTTP 客户端
- **Room** - 本地数据库
- **DataStore** - 数据存储
- **WebSocket** - 实时通信

### UI/导航
- **Compose Navigation** - 类型安全导航
- **Material3** - Material Design 3 设计系统
- **Coil** - 图片加载库

### 异步/响应式
- **Kotlin Coroutines** - 协程异步处理
- **Flow** - 响应式数据流

## 项目结构

```
app/src/main/java/com/sker/weibo/
├── domain/                 # 领域层（核心业务逻辑）
│   ├── model/             # 领域模型
│   ├── repository/        # 仓储接口
│   └── usecase/          # 用例
├── data/                  # 数据层
│   ├── local/            # 本地数据源
│   │   └── database/     # Room 数据库
│   ├── remote/           # 远程数据源
│   │   ├── ApiService    # Retrofit API
│   │   └── WebSocketManager
│   ├── dto/              # 数据传输对象
│   └── repository/       # 仓储实现
├── presentation/          # 展示层
│   ├── ui/              # Compose UI 组件
│   ├── viewmodel/       # ViewModel
│   ├── navigation/      # 导航配置
│   └── MainActivity
└── di/                  # 依赖注入模块
```

## 快速开始

### 环境要求
- Android Studio Hedgehog (2023.1.1) 或更高版本
- JDK 17
- Android SDK API 34
- Gradle 8.2

### 运行项目

1. **克隆项目**
```bash
cd apps/android
```

2. **配置环境变量**（可选）

在项目根目录创建 `local.properties`：
```properties
# 开发环境 API 地址（默认使用模拟器 localhost 映射）
api.base.url=http://10.0.2.2:8089/api/
ws.base.url=http://10.0.2.2:8089

# 真机调试使用本机 IP
# api.base.url=http://192.168.x.x:8089/api/
# ws.base.url=http://192.168.x.x:8089
```

3. **同步 Gradle**
```bash
./gradlew build
```

4. **运行应用**
```bash
./gradlew installDebug
adb shell am start -n com.sker.weibo/.presentation.MainActivity
```

## 开发指南

### 添加新功能

1. **领域层**：定义模型和用例
```kotlin
// domain/model/FeatureModel.kt
data class FeatureModel(val id: String, val name: String)

// domain/usecase/GetFeatureUseCase.kt
class GetFeatureUseCase @Inject constructor(
    private val repository: FeatureRepository
) {
    suspend operator fun invoke(id: String): FeatureModel { ... }
}
```

2. **数据层**：实现仓储
```kotlin
// data/repository/FeatureRepositoryImpl.kt
@Singleton
class FeatureRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : FeatureRepository {
    override suspend fun getFeature(id: String): FeatureModel { ... }
}
```

3. **展示层**：创建 UI 和 ViewModel
```kotlin
// presentation/viewmodel/FeatureViewModel.kt
@HiltViewModel
class FeatureViewModel @Inject constructor(
    private val getFeatureUseCase: GetFeatureUseCase
) : ViewModel() { ... }

// presentation/ui/FeatureScreen.kt
@Composable
fun FeatureScreen(viewModel: FeatureViewModel = hiltViewModel()) { ... }
```

### API 集成

应用已与后端 `@sker/api` 集成，主要接口：

| 端点 | 说明 | 方法 |
|------|------|------|
| `/api/claude/clients` | 获取在线客户端列表 | GET |
| `/api/claude/chat` | 发送消息 | POST |
| `/api/claude/history` | 获取聊天历史 | GET |

### WebSocket 通信

WebSocket 实时连接用于接收流式响应：

```kotlin
// 连接 WebSocket
chatRepository.connectWebSocket(clientId)

// 监听消息
chatRepository.getWebSocketMessages()
    .collect { message ->
        when (message) {
            is WebSocketMessage.TextMessage -> { ... }
            is WebSocketMessage.StreamChunk -> { ... }
            is WebSocketMessage.TokenUsage -> { ... }
        }
    }
```

## 构建配置

### 开发版本
```bash
./gradlew assembleDebug
```

### 生产版本
```bash
./gradlew assembleRelease
```

### 运行测试
```bash
# 单元测试
./gradlew test

# UI 测试
./gradlew connectedAndroidTest
```

## 最佳实践

### 1. 遵循 Clean Architecture
- **Domain** 层不依赖任何 Android 框架
- **Data** 层通过接口与 Domain 交互
- **Presentation** 层通过 UseCase 调用业务逻辑

### 2. 使用 Hilt 依赖注入
```kotlin
@HiltViewModel
class MyViewModel @Inject constructor(
    private val useCase: MyUseCase
) : ViewModel()
```

### 3. 响应式 UI 更新
```kotlin
val uiState by viewModel.uiState.collectAsState()
```

### 4. 错误处理
```kotlin
viewModelScope.launch {
    useCase()
        .onSuccess { result -> ... }
        .onFailure { error -> ... }
}
```

## 性能优化

- **数据库索引**：Room 实体已配置索引
- **网络缓存**：OkHttp 配置了连接池
- **懒加载**：使用 Flow 按需加载数据
- **内存管理**：ViewModel 自动清理资源

## 安全性

- **HTTPS**：生产环境强制使用 HTTPS
- **证书固定**：可配置 OkHttp CertificatePinner
- **数据加密**：敏感数据使用 EncryptedSharedPreferences

## 故障排查

### 模拟器网络问题
```bash
# 检查模拟器网络
adb shell ping 10.0.2.2

# 检查端口转发
adb forward tcp:8089 tcp:8089
```

### WebSocket 连接失败
1. 确认后端服务运行在 `http://localhost:8089`
2. 检查防火墙设置
3. 验证 `ws.base.url` 配置正确

### 数据库迁移问题
```kotlin
// 开发时启用破坏性迁移
fallbackToDestructiveMigration()
```

## 贡献指南

1. 遵循 Kotlin 代码规范
2. 为公共 API 添加 KDoc 注释
3. 编写单元测试覆盖核心逻辑
4. 使用 Compose Preview 验证 UI

## 许可证

MIT License
