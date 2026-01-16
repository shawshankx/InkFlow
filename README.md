# 📝 InkFlow - AI-Powered Private Note App

[![Go Report Card](https://goreportcard.com/badge/github.com/shawshankx/InkFlow)](https://goreportcard.com/report/github.com/shawshankx/InkFlow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)

[中文文档](#中文介绍) | [English Documentation](#english-documentation)

---

<a name="中文介绍"></a>
## 中文介绍

**InkFlow** 是一个轻量级、注重隐私的现代化笔记应用。它结合了 **Go** 后端的高性能与 **React** 前端的流畅体验，支持 Markdown 实时预览、**AI 智能润色**以及基于 MySQL 的可靠数据存储。

最重要的是，它是**完全私有化部署**的——你的数据掌握在你自己手中，而不是云厂商的服务器上。

### ✨ 核心特性

- **🔒 数据私有化**：笔记全量存储于本地 **MySQL** 数据库，绝不上传云端，保障个人数据绝对安全与隐私。
- **🤖 AI 智能协同**：深度集成 AI 润色与纠错功能，支持流式输出体验，可自由接入 DeepSeek、OpenAI 等主流大模型。
- **📝 沉浸式 Markdown 体验**：采用分级分屏布局，左侧高效输入，右侧实时渲染，支持标准语法与代码高亮。
- **� 现代化文件夹体系**：
    - **结构化管理**：基于关系型数据库的文件夹系统，支持创建空文件夹，分类清晰。
    - **无感重命名**：侧边栏**内联编辑**，无需多余弹窗，回车即刻保存。
    - **上下文感知**：智能识别当前选中的目录上下文，新笔记自动归类，告别手动调整。
- **🖱️ 丝滑交互流程**：
    - **自由拖拽**：支持 **Drag & Drop** 原生交互，单手即可完成笔记跨目录搬运，无需多余确认流程。
    - **隐形自动保存**：标题与内容双向静默自动保存，交互逻辑高度精简，专注创作不再分心。
- **�️ 增强型批量工具**：
    - **高效整理**：一键开启批量模式，支持跨笔记多选与文件夹级联操作。
    - **快速导出/清理**：支持多选导出为 ZIP（保留完整目录结构）或一键安全销毁。
- **🚀 零门槛私有化部署**：基于 Docker Compose 编排，环境一键拉起，多阶段构建极致缩小镜像体积。

### 🛠 技术栈

- **Frontend**: React 18, TypeScript, Vite, React-Markdown, Lucide Icons.
- **Backend**: Go (Golang), Gin Web Framework, **GORM** (ORM Library).
- **Database**: **MySQL 8.0** (Relational Database).
- **DevOps**: Docker, Docker Compose (Multi-stage builds).

### 🏗️ 项目结构

```text
inkflow/
├── docker-compose.yml    # 容器编排配置
├── Dockerfile            # 多阶段构建脚本
├── backend/
│   ├── main.go           # Go 程序入口 (依赖注入与路由)
│   ├── go.mod            # Go 依赖定义
│   └── internal/         # 内部业务逻辑 (分层架构)
│       ├── handler/      # HTTP 接口层 (控制层)
│       ├── store/        # 数据库操作层 (GORM 实现)
│       └── model/        # 数据模型定义
└── frontend/
    ├── src/              # React 源代码
    ├── vite.config.ts    # 前端构建配置
    └── package.json      # 前端依赖定义
```

### 🚀 快速开始 (Docker 部署)

这是最推荐的运行方式，只需 3 步即可拥有你自己的 AI 笔记应用。

**前置要求**：
- 安装 [Docker](https://docs.docker.com/get-docker/) 和 `docker compose` 插件。

#### 1. 获取代码
确保你的本地目录包含完整的项目文件。
```bash
git clone https://github.com/shawshankx/InkFlow.git
cd InkFlow
```

#### 2. 配置环境变量
项目根目录提供了一个配置模板。请复制一份并重命名为 `.env`，然后填入你的 API Key。

**Mac / Linux:**
```bash
cp .env.example .env
```
**Windows:** 直接复制 `.env.example` 并重命名为 `.env`。

然后用编辑器打开 `.env` 文件，修改以下配置：
```yaml
AI_API_KEY=sk-your-real-key-here  # <--- [必填] 你的 AI Key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL_NAME=deepseek-chat       # <--- [可选] 指定模型
```
💡 **提示**：推荐使用 DeepSeek（深度求索），价格便宜且中文润色效果极佳。

#### 3. 一键启动
在项目根目录下执行：

```bash
docker compose up -d --build
```
*(注意：旧版 Docker 可能需要使用 `docker-compose` 命令)*

首次运行需要下载编译环境，可能需要 5-10 分钟。构建完成后，访问：
- **笔记应用**: http://localhost:8080
- **数据库端口**: `localhost:3306` (默认用户 `root` / 密码 `rootpassword`)

---

### ⚙️ 配置说明

你可以在 `docker-compose.yml` 或 `.env` 中修改以下环境变量：

**AI 服务配置**

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `AI_API_KEY` | (必填) | OpenAI 格式的 API Key |
| `AI_BASE_URL` | `https://api.deepseek.com` | AI 服务接口地址（支持 ChatGPT / DeepSeek / Ollama） |
| `AI_MODEL_NAME` | `deepseek-chat` | 模型名称（如 `gpt-4o`, `deepseek-coder`） |

**数据库配置 (MySQL)**

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DB_HOST` | `mysql` | 数据库容器名或地址 |
| `DB_PORT` | `3306` | 数据库端口 |
| `DB_USER` | `root` | 数据库用户名 |
| `DB_PASSWORD` | `rootpassword` | 数据库密码 |
| `DB_NAME` | `notes_db` | 数据库名称 |

---

### 💻 本地开发指南 (可选)

如果你想修改代码并进行调试，可以分别运行前后端：

1. **启动数据库:**
   ```bash
   docker compose up mysql -d
   ```

2. **启动后端 (Go):**
   ```bash
   cd backend
   # 配置本地连接的环境变量
   export DB_HOST=localhost
   export AI_API_KEY=your_key
   go run main.go
   ```

3. **启动前端 (React):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   访问 http://localhost:5173 进行开发。

---

<a name="english-documentation"></a>
## English Documentation

InkFlow is a lightweight, privacy-focused modern note-taking application. It combines the high performance of a Go backend with the smooth experience of a React frontend. It supports real-time Markdown preview, AI-powered polishing, and reliable storage based on MySQL.

Most importantly, it is **self-hosted**—your data stays in your hands, not on a cloud provider's server.

### ✨ Key Features

- **🔒 Privacy First**: All notes are stored locally in a private **MySQL** database. No cloud syncing, ensuring total data ownership.
- **🤖 AI Synergy**: Deeply integrated AI polishing with streaming responses. Compatible with OpenAI, DeepSeek, and custom AI endpoints.
- **📝 Immersive Markdown**: High-performance editor with real-time synchronized preview and standard syntax support.
- **� Modern Folder Management**:
    - **Structured Organization**: Relational-backed folder system with support for empty folders and organizational hierarchies.
    - **Inline Renaming**: Intuitive sidebar editing without intrusive popups. Save changes instantly with a single Enter.
    - **Contextual Creation**: Smart context detection. New notes automatically inherit the currently active folder.
- **🖱️ Seamless UX Flow**:
    - **D&D Organization**: Native **Drag & Drop** support for effortless note relocation between folders.
    - **Invisible Auto-Save**: Silent, debounced saving for both titles and content. No manual save buttons or annoying success alerts.
- **�️ Pro Batch Operations**:
    - **Mass Management**: Dedicated batch mode for selecting multiple notes or entire folders.
    - **Export & Cleanup**: Bulk export notes to ZIP (preserving structure) or perform cascading deletions.
- **🚀 Cloud-Native Deployment**: One-click setup via Docker Compose. Multi-stage builds for optimized container performance.

### 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React-Markdown, Lucide Icons.
- **Backend**: Go (Golang), Gin Web Framework, GORM (ORM Library).
- **Database**: MySQL 8.0 (Relational Database).
- **DevOps**: Docker, Docker Compose (Multi-stage builds).

### 🏗️ Project Structure

```text
inkflow/
├── docker-compose.yml    # Container orchestration
├── Dockerfile            # Multi-stage build script
├── backend/
│   ├── main.go           # Entry point (DI & Routing)
│   ├── go.mod            # Go module definitions
│   └── internal/         # Internal business logic
│       ├── handler/      # HTTP handlers (Controller layer)
│       ├── store/        # Database operations (GORM implementation)
│       └── model/        # Data models
└── frontend/
    ├── src/              # React source code
    ├── vite.config.ts    # Frontend build config
    └── package.json      # Frontend dependencies
```

### 🚀 Quick Start (Docker)

This is the recommended way to run InkFlow.

**Prerequisites**:
- [Docker](https://docs.docker.com/get-docker/) and `docker compose` plugin installed.

#### 1. Get the Code
```bash
git clone https://github.com/shawshankx/InkFlow.git
cd InkFlow
```

#### 2. Configure Environment
Copy `.env.example` to `.env` and configure your API Key.

**Mac / Linux:**
```bash
cp .env.example .env
```
**Windows:** Copy `.env.example` to `.env`.

Open `.env` and set:
```yaml
AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx  # <--- Required
AI_BASE_URL=https://api.deepseek.com
AI_MODEL_NAME=deepseek-chat       # <--- Optional
```

#### 3. Start the App
Run the following command in the project root:

```bash
docker compose up -d --build
```
*(Note: Use `docker-compose` if you have an older Docker version)*

Wait for the build to finish. Once running, access:
- **App**: http://localhost:8080
- **Database**: `localhost:3306` (User: `root`, Password: `rootpassword`)

### ⚙️ Configuration

You can modify environment variables in `docker-compose.yml` or `.env`.

**AI Service**

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_API_KEY` | (Required) | OpenAI-format API Key |
| `AI_BASE_URL` | `https://api.deepseek.com` | API Endpoint (ChatGPT / DeepSeek / Ollama) |
| `AI_MODEL_NAME` | `deepseek-chat` | AI Model Name (e.g. `gpt-4o`, `deepseek-coder`) |

**Database (MySQL)**

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `mysql` | Service name or IP |
| `DB_PORT` | `3306` | Port number |
| `DB_USER` | `root` | Username |
| `DB_PASSWORD` | `rootpassword` | Password |
| `DB_NAME` | `notes_db` | Database name |

### 🤝 Contribution

Issues and Pull Requests are welcome! If you find this project helpful, please give it a ⭐️ Star!

### 📄 License

[MIT License](./LICENSE)