## 📝 InkFlow - AI-Powered Private Note App

[中文文档](#中文介绍) | [English Documentation](#english-documentation)

---

<a name="-中文介绍"></a>
## 中文介绍

**InkFlow** 是一个轻量级、注重隐私的现代化笔记应用。它结合了 **Go** 后端的高性能与 **React** 前端的流畅体验，支持 Markdown 实时预览、**AI 智能润色**以及基于 MySQL 的可靠数据存储。

最重要的是，它是**完全私有化部署**的——你的数据掌握在你自己手中，而不是云厂商的服务器上。

### ✨ 核心特性

- **🔒 数据隐私优先**：所有笔记存储在本地 **MySQL** 数据库中，结构化存储，安全可靠。
- **🤖 AI 智能辅助**：内置 AI 润色功能，支持流式输出（打字机效果），可接入 OpenAI、DeepSeek 等模型。
- **📝 Markdown 编辑**：左侧编辑，右侧实时预览，支持标准 Markdown 语法。
- **🚀 单机极速部署**：基于 Docker Compose，前端、后端、数据库一键拉起。
- **☁️ 云原生架构**：采用经典分层架构（Handler/Service/Store），后端 Go + Gin + GORM，前端 React + Vite。
- **📂 笔记管理**：支持笔记列表查看、新建、保存、删除和即时加载。

### 🛠 技术栈

- **Frontend**: React 18, TypeScript, Vite, React-Markdown, Lucide Icons.
- **Backend**: Go (Golang) 1.23, Gin Web Framework, **GORM** (ORM Library).
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

1. 获取代码  
   确保你的本地目录包含完整的项目文件。
   ```bash
   git clone [https://github.com/shawshankx/InkFlow.git](https://github.com/shawshankx/InkFlow.git)
   cd inkflow
   ```

2. 配置环境变量  
   项目根目录提供了一个配置模板。请复制一份并重命名为 .env，然后填入你的 API Key。
   `Linux / Mac:`
   ```bash
   cp .env.example .env
   ```
   `Windows:` 直接复制 .env.example 并重命名为 .env。
   然后用编辑器打开 .env 文件，修改以下配置：

   ```yaml
   AI_API_KEY=sk-your-real-key-here  # <--- 必填：你的 AI Key
   AI_BASE_URL=[https://api.deepseek.com](https://api.deepseek.com)
   ```  
   💡 提示：推荐使用 DeepSeek（深度求索），价格便宜且中文润色效果极佳。  

3. 一键启动  
   在项目根目录下执行：

   ```bash
   docker-compose up -d --build
   ```

首次运行需要下载编译环境，可能需要 5-10 分钟。构建完成后，访问：  
笔记应用: http://localhost:8080  
数据库端口: localhost:3306 (默认用户 root / 密码 rootpassword)

### ⚙️ 配置说明

你可以在 docker-compose.yml 中修改以下环境变量：

**AI 服务配置**

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| AI_API_KEY | （必填） | OpenAI 格式的 API Key |
| AI_BASE_URL | https://api.deepseek.com | AI 服务接口地址（支持 ChatGPT / DeepSeek / Ollama） |

**数据库配置 (MySQL)**

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DB_HOST | mysql | 数据库容器名或地址 |
| DB_PORT | 3306 | 数据库端口 |
| DB_USER | root | 数据库用户名 |
| DB_PASSWORD | rootpassword | 数据库密码 |
| DB_NAME | notes_db | 数据库名称 |


### 💻 本地开发指南 (可选)

如果你想修改代码并进行调试，可以分别运行前后端：

**启动数据库:**

```bash
docker-compose up mysql -d
```

**启动后端 (Go):**

```bash
cd backend
# 配置本地连接的环境变量
export DB_HOST=localhost
export AI_API_KEY=your_key
go run main.go
```

**启动前端 (React):**

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

Most importantly, it is self-hosted—your data stays in your hands, not on a cloud provider's server.

### ✨ Key Features

- 🔒 Privacy First: All notes are stored locally in a MySQL database, ensuring full data ownership.
- 🤖 AI Assistance: Built-in AI polishing feature with streaming output (typewriter effect), supporting OpenAI, DeepSeek, and compatible models.
- 📝 Markdown Editor: Split-pane editor with real-time preview, supporting standard Markdown syntax.
- 🚀 Fast Deployment: Docker Compose based setup. Spin up the frontend, backend, and database with a single command.
- ☁️ Cloud-Native Architecture: Layered architecture (Handler/Store/Model), utilizing Go + Gin + GORM backend and React + Vite frontend.
- 📂 Note Management: Create, read, update, delete (CRUD), and list your notes instantly.

### 🛠 Tech Stack

Frontend: React 18, TypeScript, Vite, React-Markdown, Lucide Icons.  
Backend: Go (Golang) 1.23, Gin Web Framework, GORM (ORM Library).  
Database: MySQL 8.0 (Relational Database).  
DevOps: Docker, Docker Compose (Multi-stage builds).

### 🏗️ Project Structure

```text
Plaintextinkflow/
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

1. Get the Code  
   Ensure you have the full project structure locally.
2. Configure Environment  
   Open docker-compose.yml, find the app service section, and enter your AI API Key.  
   YAMLenvironment:

   ```yaml
   - AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx  # <--- Enter your Key here
   - AI_BASE_URL=https://api.deepseek.com
   ```

3. Start the App  
   Run the following command in the project root:

   ```bash
   docker-compose up -d --build
   ```

Wait for the build to finish. Once running, access:  
App: http://localhost:8080  
Database: localhost:3306 (User: root, Password: rootpassword)

### ⚙️ Configuration

You can modify the following environment variables in docker-compose.yml:

**AI Service**

| Variable | Default | Description |
|----------|---------|-------------|
| AI_API_KEY | (Required) | OpenAI-format API Key |
| AI_BASE_URL | https://api.deepseek.com | API Endpoint (ChatGPT / DeepSeek / Ollama) |


**Database (MySQL)**

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | mysql | Service name or IP |
| DB_PORT | 3306 | Port number |
| DB_USER | root | Username |
| DB_PASSWORD | rootpassword | Password |
| DB_NAME | notes_db | Database name |

### 💻 Local Development (Optional)

If you want to modify code and debug:

**Start Database:**

```bash
docker-compose up mysql -d
```

**Start Backend (Go):**

```bash
cd backend
export DB_HOST=localhost
export AI_API_KEY=your_key
go run main.go
```

**Start Frontend (React):**

```bash
cd frontend
npm install
npm run dev
```

Access http://localhost:5173 for development.

### 🤝 Contribution

Issues and Pull Requests are welcome!If you find this project helpful, please give it a ⭐️ Star!


### 📄 License

[MIT License](./LICENSE)