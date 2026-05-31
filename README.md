<div align="center">

# **EMOS Web**

## EMOS 用户自助控制台 — 账号 · 服务 · 媒体 · Serverless

[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js&logoColor=white)](https://nextjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![pnpm](https://img.shields.io/badge/pnpm-ready-F69220?logo=pnpm)](https://pnpm.io/) [![Serverless](https://img.shields.io/badge/Deploy-Serverless-7C3AED)](https://vercel.com/)

</div>

---

## ✨ 功能特性

| 模块 | 说明 |
| ---- | ---- |
| **网页授权登录** | 通过 EMOS 官方授权入口登录，回调后自动保存 Token 并进入控制台 |
| **Token 登录** | 支持手动输入 Bearer Token，校验成功后进入用户控制台 |
| **用户仪表盘** | 展示萝卜余额、上传容量、邀请额度、片单卡槽与服务状态 |
| **每日签到** | 在仪表盘提供高频签到入口，签到后自动刷新用户数据 |
| **账号信息** | 查看用户 ID、用户名、笔名、Telegram 绑定、权限与服务字段 |
| **账号操作** | 支持临时密码、修改笔名、重置密码、显示空媒体库、同意上传协议 |
| **服务管理** | 展示 Video、Live、Music 等服务地址，并提供一键复制 |
| **快捷操作** | 预留转赠萝卜、邀请用户、红包工具、抽奖工具、投票工具、请求记录入口 |
| **路由化控制台** | `/user` 下拆分仪表盘、用户信息、媒体库、上传、片单、反代、求片、邀请页面 |
| **移动端适配** | 桌面端侧边栏，移动端使用顶部入口 + 底部抽屉导航 |
| **主题系统** | 支持 Light / Dark / System 明暗模式切换 |
| **Serverless Proxy** | 使用 Next.js Route Handler 代理 EMOS API，适配 Vercel / Cloudflare / EdgeOne Pages |

---

## 🧭 当前路由

| 路由 | 说明 | 状态 |
| ---- | ---- | ---- |
| `/` | 登录页，包含网页授权登录与 Token 登录 | ✅ |
| `/user` | 用户仪表盘首页 | ✅ |
| `/user/profile` | 用户信息与账号操作 | ✅ |
| `/user/media` | 媒体库 | 🚧 占位 |
| `/user/upload` | 上传视频 | 🚧 占位 |
| `/user/watchlist` | 片单列表 | 🚧 占位 |
| `/user/proxy` | 反代设置 | 🚧 占位 |
| `/user/seek` | 求片 | 🚧 占位 |
| `/user/invite` | 邀请 | 🚧 占位 |

> 控制台路由目前采用客户端 Token 恢复与保护。未登录访问 `/user` 会返回登录页。

---

## 🚀 快速开始

### 环境要求

| 项目 | 版本 |
| ---- | ---- |
| Node.js | 建议 ≥ 20 |
| pnpm | 建议 ≥ 9 |

### 环境变量

在项目根目录创建 `.env`：

```bash
EMOS_API_BASE_URL=https://api.emos.best
```

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 打开浏览器访问
http://localhost:3000
```

### 可用脚本

| 命令 | 说明 |
| ---- | ---- |
| `pnpm dev` | 启动 Next.js 开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | ESLint 代码检查，要求 0 warning |
| `pnpm typecheck` | TypeScript 类型检查 |

---

## 🛠 技术栈

| 类别 | 技术 |
| ---- | ---- |
| 框架 | [Next.js](https://nextjs.org/) 16 App Router |
| 语言 | [TypeScript](https://www.typescriptlang.org/) |
| 样式 | [Tailwind CSS](https://tailwindcss.com/) 3 |
| 图标 | [Lucide React](https://lucide.dev/) |
| 包管理 | [pnpm](https://pnpm.io/) |
| API 代理 | Next.js Route Handlers + 标准 `fetch` |
| 部署目标 | Vercel / Cloudflare Pages / EdgeOne Pages 等 Serverless 平台 |

---

## 📂 项目结构

```txt
emos_web/
├── app/
│   ├── page.tsx                    # 登录页
│   ├── layout.tsx                  # 全局布局与主题启动脚本
│   ├── globals.css                 # 全局样式、主题变量、网格背景
│   ├── api/
│   │   └── emos/[...path]/route.ts # EMOS API Serverless Proxy
│   └── user/
│       ├── layout.tsx              # 用户控制台布局
│       ├── page.tsx                # 仪表盘首页
│       ├── profile/page.tsx        # 用户信息与账号操作
│       ├── media/page.tsx          # 媒体库占位页
│       ├── upload/page.tsx         # 上传视频占位页
│       ├── watchlist/page.tsx      # 片单列表占位页
│       ├── proxy/page.tsx          # 反代设置占位页
│       ├── seek/page.tsx           # 求片占位页
│       └── invite/page.tsx         # 邀请占位页
├── components/
│   ├── dashboard/                  # 控制台 Shell、导航、用户中心与仪表盘卡片
│   ├── ui/                         # 玻璃面板、状态徽章、指标卡片等基础组件
│   ├── app-top-bar.tsx             # 顶部品牌区与主题入口
│   ├── landing-view.tsx            # 登录页视图
│   └── theme-toggle.tsx            # 明暗模式切换
├── lib/
│   ├── api/                        # EMOS API 客户端、类型与请求封装
│   ├── auth/session.ts             # Token 本地存储与授权回调解析
│   └── utils.ts                    # 通用工具函数
├── emos_api.md                     # EMOS API 参考文档
├── check-cx ui.md                  # 视觉风格参考
├── next.config.ts                  # Next.js 配置
└── package.json
```

---

## 🌐 部署

### Docker 部署

项目支持标准 Next.js standalone Docker 镜像，适合部署到自有服务器，避免 Serverless 平台出口 IP 被 EMOS Cloudflare/WAF 拦截。

#### 使用 Docker Hub 镜像（推荐）

```bash
docker pull kiyukie/emos-web:latest
docker run -d \
  --name emos-web \
  --restart unless-stopped \
  -p 5791:5791 \
  -e EMOS_API_BASE_URL=https://api.emos.best \
  kiyukie/emos-web:latest
```

#### 使用 docker-compose

创建 `docker-compose.yml`：

```yaml
services:
  emos-web:
    image: kiyukie/emos-web:latest
    container_name: emos-web
    restart: unless-stopped
    ports:
      - "5791:5791"
    environment:
      EMOS_API_BASE_URL: https://api.emos.best
```

启动服务：

```bash
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

默认监听：

```txt
http://服务器 IP:5791
```

如需反向代理，推荐在 Nginx / Caddy 中将域名转发到本机 `127.0.0.1:5791`。

### Vercel

1. 将仓库推送到 GitHub
2. 在 [Vercel](https://vercel.com/) 导入项目
3. 配置环境变量：`EMOS_API_BASE_URL=https://api.emos.best`
4. 部署

### Cloudflare Pages / EdgeOne Pages

1. 将仓库连接到 Pages 平台
2. 构建命令设置为：

```bash
pnpm build
```

3. 环境变量配置：

```bash
EMOS_API_BASE_URL=https://api.emos.best
```

4. 根据目标平台的 Next.js 适配要求配置输出方式

---

## 🔌 已接入 API

| 能力 | 接口 |
| ---- | ---- |
| 登录校验 | `GET /api/sign/check` |
| 用户信息 | `GET /api/user` |
| 每日签到 | `PUT /api/user/sign` |
| 临时密码 | `GET /api/user/passwordTemporary` |
| 修改笔名 | `PUT /api/user/pseudonym` |
| 显示空媒体库 | `PUT /api/user/showEmpty` |
| 重置密码 | `PUT /api/user/passwordReset` |
| 同意上传协议 | `PUT /api/user/agreeUploadAgreement` |

所有请求通过本项目的 `/api/emos/[...path]` 代理到 `EMOS_API_BASE_URL`。

---

## 🧩 后续计划

| 优先级 | 内容 |
| ------ | ---- |
| P0 | 完善路由化控制台与用户中心稳定性 |
| P1 | 接入邀请模块，支持邀请信息、邀请历史与邀请用户 |
| P1 | 接入媒体库列表、详情、移动、重命名与删除 |
| P2 | 接入上传视频与字幕上传流程 |
| P2 | 接入片单管理、订阅、排序与片单内视频维护 |
| P2 | 接入反代线路管理 |
| P3 | 接入求片、投票、认领与催更流程 |
| P3 | 完善设备管理、请求记录与更多账号安全能力 |

---

## 🎨 设计方向

本项目视觉风格参考 `check-cx ui.md`：

- 工程终端感的信息层级
- 克制的语义状态色
- 玻璃拟态面板与轻量边框
- 全局网格背景
- 桌面端侧边栏与移动端底部抽屉
- 避免把移动端简单压缩成桌面布局

---

## 📜 说明

本项目是面向 EMOS 用户的自助控制台前端，不包含独立后端服务。部署时通过 Serverless Route Handler 转发 EMOS API 请求。
