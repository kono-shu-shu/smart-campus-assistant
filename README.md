# 智慧校园助手 Smart Campus Assistant

> 山东商业职业技术大学 · 华为开发者大赛：华为云码道（CodeArts）赛题（信息技术组）参赛项目

一款基于 **Android WebView 混合架构** 的移动端智慧校园应用，集课程表管理、笔记共享、校园墙图文、即时通讯、管理员大数据控制台于一体，采用 **Soft Geometric Bold** 视觉体系，支持离线降级与远程后端双模式运行。

---

## 项目架构

```
smart-campus-assistant/
├── server/                      # Node.js 后端服务（零依赖）
│   ├── server.js                # 核心 HTTP 服务（登录/笔记/帖子/聊天/管理员统计）
│   ├── mini_xlsx.js             # 原生 .xlsx 读写引擎（零依赖）
│   └── data/                    # 持久化数据文件
│       ├── students.xlsx        # 学生账号（Excel 格式）
│       ├── admins.xlsx          # 管理员账号（Excel 格式）
│       ├── notes.json           # 笔记数据
│       ├── wall_posts.json      # 校园墙帖子
│       ├── comments.json        # 笔记评论
│       ├── chat_messages.json   # 聊天消息
│       └── chat_groups.json     # 群聊分组
│
├── web/                         # 前端 Web 资源（被 WebView 加载）
│   ├── index.html               # 主界面（课程表/笔记/校园墙/聊天/个人中心）
│   ├── login.html               # 统一身份认证登录页
│   ├── note_detail.html         # 笔记详情页（Markdown 渲染 + 评论）
│   ├── note_edit.html           # 笔记编辑页（EasyMDE 编辑器）
│   ├── admin_dashboard.html     # 管理员大数据控制台
│   ├── admin_stats_detail.html  # 数据维度详情页（Canvas 图表）
│   ├── student_manage.html      # 学生档案管理页（CRUD）
│   ├── favicon.png              # 网页图标
│   ├── css/style.css            # 全局 Soft Geometric Bold 主题样式
│   ├── js/
│   │   ├── data.js              # 数据管理层（后端优先 + 本地降级策略）
│   │   ├── app.js               # 核心业务逻辑
│   │   ├── bridge.js            # JSBridge 通信适配层
│   │   └── markdown.js          # 零依赖 Markdown 解析引擎
│   └── libs/                    # 开源库（MIT License）
│       ├── easymde.js           # EasyMDE Markdown 编辑器
│       ├── easymde.css          # EasyMDE 样式
│       └── marked.min.js        # marked 解析器
│
├── android/                     # Android 原生工程
│   ├── build.gradle             # 根构建脚本
│   ├── settings.gradle          # 工程设置
│   ├── gradle.properties        # Gradle 配置（AndroidX 启用）
│   ├── .github/workflows/
│   │   └── build-apk.yml        # GitHub Actions 云端构建 APK
│   ├── app/
│   │   ├── build.gradle         # 模块构建脚本
│   │   ├── proguard-rules.pro   # ProGuard 混淆规则
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/sdsctc/campusbrowser/
│   │       │   ├── MainActivity.java          # WebView 容器 + 文件选择器
│   │       │   ├── bridge/WebAppInterface.java # JSBridge 原生接口
│   │       │   ├── widget/CourseWidgetProvider.java  # 桌面 AppWidget
│   │       │   ├── receiver/CourseMuteReceiver.java  # 上课自动静音
│   │       │   └── util/PreferenceUtil.java    # SharedPreferences 工具
│   │       ├── res/              # 资源文件（布局/图标/样式）
│   │       └── assets/web/       # 内嵌前端资源（离线加载）
│   └── gradle/wrapper/           # Gradle Wrapper
│
└── README.md                     # 项目自述文件（本文件）
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **Android 原生** | Java + WebView | WebView 容器加载内嵌 Web 前端，JSBridge 双向通信 |
| **前端** | 原生 HTML/CSS/JS | 零框架依赖，Soft Geometric Bold 视觉体系 |
| **后端** | Node.js（零依赖） | 原生 `http` 模块，不依赖任何 npm 包 |
| **数据存储** | Excel + JSON | 账号存 `.xlsx`，业务数据存 `.json`，课表存 `localStorage` |
| **桌面组件** | AppWidget | 课程表桌面小组件，点击跳转主应用 |
| **构建** | GitHub Actions | 云端编译 APK，无需本地 Android SDK |
| **开源库** | EasyMDE / marked | Markdown 编辑与解析（MIT License） |

---

## 核心功能

### 学生端
- **课程表管理** — 周视图展示、导入/导出时光序格式、桌面 AppWidget 同步、上课自动静音
- **笔记共享** — Markdown 编辑/渲染、学科分类、评论互动
- **校园墙** — 图文发布（支持本地图片上传）、点赞/评论/置顶、分类筛选
- **即时通讯** — 群聊/私聊、与老师私聊、未读消息红点提示、消息后端持久化
- **个人中心** — 信息展示、退出登录

### 管理员端
- **大数据控制台** — 学生/笔记/帖子/消息多维统计可视化（Canvas 原生图表）
- **学生档案管理** — 增删改查、重置密码、Excel 实时同步
- **数据维度钻取** — 独立详情页按维度动态加载图表

---

## 离线降级策略

前端采用 **"后端优先、本地降级"** 策略，确保后端离线时基本功能不受影响：

```
数据读取：fetch 后端 API → 成功则缓存 localStorage → 失败降级 localStorage / 预设数据
数据写入：先存 localStorage → 异步同步后端（fire-and-forget）
课程表：纯 localStorage（个人课业数据不走云端）
```

---

## 快速开始

### 后端部署

```bash
# 克隆仓库
git clone https://github.com/kono-shu-shu/smart-campus-assistant.git
cd smart-campus-assistant/server

# 启动服务（需 Node.js 18+）
node server.js
# 服务监听 http://0.0.0.0:3000

# 生产环境推荐 PM2 守护
npm install -g pm2
pm2 start server.js --name campus-server
pm2 save && pm2 startup
```

### 前端开发

前端文件位于 `web/` 目录，直接用浏览器打开 `index.html` 即可（需后端运行）。

修改 `js/data.js` 中的 `API_BASE` 指向后端地址：
```javascript
const API_BASE = 'http://127.0.0.1:3000';  // 本地开发
// const API_BASE = 'http://your-server:3000';  // 远程服务器
```

### APK 构建

APK 通过 GitHub Actions 云端构建，无需本地安装 Android SDK：

1. 推送代码到 `main` 分支
2. GitHub Actions 自动触发构建
3. 从 Actions 页面下载 `app-debug.apk`

手动本地构建（需 Android Studio）：
```bash
cd android
./gradlew assembleDebug
# APK 输出：app/build/outputs/apk/debug/app-debug.apk
```

---

## 默认账号

| 角色 | 账号 | 密码 | 姓名 |
|------|------|------|------|
| 学生 | 260203 | 123 | 李晨阳 |
| 学生 | 260204 | 123 | 苏雨婷 |
| 管理员 | 114514 | admin | 赵辅导员 |

---

## 开源引用

| 库 | 用途 | License |
|----|------|---------|
| [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) | Markdown 编辑器 | MIT |
| [marked](https://github.com/markedjs/marked) | Markdown 解析器 | MIT |

---

## 项目信息

- **参赛单位**：山东商业职业技术大学
- **赛题**：华为云码道（CodeArts）赛题（信息技术组）
- **包名**：`com.sdsctc.campusbrowser`
- **最低 SDK**：Android 7.0（API 24）
- **目标 SDK**：Android 14（API 34）
- **视觉体系**：Soft Geometric Bold（包豪斯/新野兽派 + 柔和米麦色调）

---

## License

本项目为参赛作品，所有代码仅供学习交流使用。引用的开源库遵循其各自 License（MIT）。