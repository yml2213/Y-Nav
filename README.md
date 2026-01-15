# Y-Nav (元启) - 你的 AI 智能导航仪表盘

<div align="center">

![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%7C%20Pages-orange?style=flat-square&logo=cloudflare)

**极简、隐私、智能。**  
**基于 Local-First 架构，配合 Cloudflare KV 实现无感多端同步。**

[在线演示](https://y-nav.yml.workers.dev) · [快速部署](#-快速部署)

</div>

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 🚀 **极简设计** | React 19 + Tailwind CSS v4，极速启动，丝滑交互 |
| ☁️ **云端同步** | Cloudflare KV 实现多设备实时同步 |
| 🧠 **AI 整理** | Google Gemini 一键生成网站简介，智能推荐分类 |
| 🔒 **安全隐私** | Local-First 架构，数据优先本地存储，支持同步密码 |
| 🎨 **个性化** | 深色模式、自定义主题色、背景风格、卡片布局 |
| 📱 **响应式** | 完美适配桌面端和移动端 |

---

## 🚀 快速部署

> **提供两种部署方式**，推荐国内用户选择 Workers 方式以获得更好的访问速度。

### 部署方式对比

| 对比项 | Cloudflare Workers | Cloudflare Pages |
|--------|-------------------|------------------|
| **国内访问** | ⭐⭐⭐ 支持优选 IP | ⭐⭐ 一般 |
| **配置难度** | 中等 | 简单 |
| **自动部署** | GitHub Actions | Cloudflare 原生 Git 集成 |
| **适合人群** | 追求速度的国内用户 | 快速体验 / 海外用户 |

---

## 方式一：Cloudflare Workers（推荐）

> 支持自定义域名 + 优选 IP，国内访问更快更稳定。

### 前置要求

- GitHub 账号
- Cloudflare 账号（免费）
- 一个托管在 Cloudflare 的域名（可选，用于优选 IP）

### 步骤 1：Fork 仓库

点击本仓库右上角的 **Fork** 按钮，将项目复制到你的 GitHub 账号。

### 步骤 2：创建 Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **My Profile** → **API Tokens** → **Create Token**
3. 选择模板：**Edit Cloudflare Workers**
4. 确认权限后点击 **Create Token**
5. **复制并保存** 生成的 Token（只显示一次）

### 步骤 3：获取 Account ID

在 Cloudflare Dashboard 任意页面的右侧栏，找到 **Account ID** 并复制。

### 步骤 4：配置 GitHub Secrets

进入你 Fork 的仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

添加以下 Secrets：

| Secret 名称 | 值 |
|------------|-----|
| `CLOUDFLARE_API_TOKEN` | 步骤 2 创建的 Token |
| `CLOUDFLARE_ACCOUNT_ID` | 步骤 3 获取的 Account ID |
| `SYNC_PASSWORD` | （可选）同步密码，用于保护数据 |

### 步骤 5：创建 KV 命名空间

1. 在 Cloudflare Dashboard 进入 **Workers & Pages** → **KV**
2. 点击 **Create a namespace**
3. 名称填入：`YNAV_WORKER_KV`
4. 创建后，**复制 Namespace ID**

### 步骤 6：更新配置文件

编辑你仓库中的 `wrangler.toml` 文件，将 KV ID 填入：

```toml
[[kv_namespaces]]
binding = "YNAV_WORKER_KV"
id = "你的 Namespace ID"  # ← 替换这里
```

### 步骤 7：触发部署

提交 `wrangler.toml` 的修改并推送到 `main` 分支，GitHub Actions 会自动构建并部署。

部署成功后，访问：`https://y-nav.<你的账号>.workers.dev`

### 步骤 8：绑定自定义域名（可选，实现优选 IP）

1. 进入 **Workers & Pages** → 你的 Worker → **Settings** → **Triggers**
2. 在 **Custom Domains** 中添加你的域名，如 `nav.example.com`
3. 在你的域名 DNS 设置中，将该子域名 CNAME 到优选 IP

---

## 方式二：Cloudflare Pages

> 配置最简单，Git 推送自动部署。

### 步骤 1：Fork 仓库

点击本仓库右上角的 **Fork** 按钮。

### 步骤 2：创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 授权并选择你 Fork 的 `Y-Nav` 仓库
4. 配置构建设置：

| 配置项 | 值 |
|--------|-----|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |

5. 点击 **Save and Deploy**

### 步骤 3：创建 KV 命名空间

1. 进入 **Workers & Pages** → **KV** → **Create a namespace**
2. 名称填入：`YNAV_DB`（或任意名称）
3. 创建成功后记住这个名称

### 步骤 4：绑定 KV 到 Pages

1. 进入你的 Pages 项目 → **Settings** → **Functions** → **KV namespace bindings**
2. 点击 **Add binding**：
   - Variable name：`YNAV_KV`（必须完全一致）
   - KV namespace：选择刚创建的 `YNAV_DB`
3. 保存后**重新部署**项目

### 步骤 5：设置同步密码（可选）

1. Pages 项目 → **Settings** → **Environment variables**
2. 添加变量：
   - Variable name：`SYNC_PASSWORD`
   - Value：你的密码
3. 保存后**重新部署**

部署成功后，访问：`https://y-nav.pages.dev`（或你自定义的域名）

---

## 🔐 同步密码设置

同步密码用于保护你的导航数据，防止他人通过 API 修改。

| 部署方式 | 设置位置 |
|---------|---------|
| Workers | GitHub Secrets 的 `SYNC_PASSWORD` 或 Worker Settings → Variables |
| Pages | Pages Settings → Environment variables |

设置后，在网站的 **设置** → **数据** 中输入相同密码即可开启同步。

---

## � 同步上游更新

当原仓库有新版本时：

**方法一：GitHub 网页操作**

在你的 Fork 仓库页面，点击 **Sync fork** → **Update branch**

**方法二：命令行**

```bash
git remote add upstream https://github.com/yml2213/Y-Nav.git
git fetch upstream
git merge upstream/main
git push
```

推送后会自动触发重新部署。

---

## 💻 本地开发

```bash
# 克隆仓库
git clone https://github.com/你的用户名/Y-Nav.git
cd Y-Nav

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动 Workers 模拟环境（需要先 wrangler login）
npm run dev:workers
```

本地服务运行在 `http://localhost:3000`

---

## 📦 项目结构

```
Y-Nav/
├── src/                    # React 前端源码
├── functions/              # Cloudflare Pages Functions (API)
│   └── api/sync.ts
├── worker/                 # Cloudflare Workers 入口
│   └── index.ts
├── .github/workflows/      # CI/CD 自动部署
│   └── deploy-workers.yml
├── wrangler.toml           # Workers 部署配置
└── package.json
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite |
| 样式 | Tailwind CSS v4, Lucide Icons |
| 状态/同步 | LocalStorage + 自定义同步引擎 |
| 后端 | Cloudflare Workers / Pages Functions + KV |
| AI | Google Generative AI SDK |

---

## 🙏 鸣谢

本项目基于以下开源项目重构：

- [CloudNav-abcd](https://github.com/aabacada/CloudNav-abcd) by aabacada
- [CloudNav](https://github.com/sese972010/CloudNav-) by sese972010

感谢原作者们的开源贡献！

---

<div align="center">

Made with ❤️ by Y-Nav Team

</div>
