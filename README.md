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
| **账号安全** | 支持临时密码、永久登录密码与视频服登录设备会话管理 |
| **服务管理** | 展示 Video、Live、Music 等服务地址，并提供一键复制 |
| **邀请管理** | 支持邀请信息、邀请历史分页搜索、邀请用户与撤销邀请 |
| **媒体库** | 支持影视列表、直播频道、音乐服务入口、标题搜索、类型筛选、资源状态筛选与无限下拉浏览 |
| **媒体详情** | 支持季集结构、媒体资源、字幕列表、播放地址、移动、重命名与删除等管理操作 |
| **上传管理** | 支持视频与字幕上传、自动匹配、上传队列和保存结果 |
| **片单管理** | 支持片单列表、搜索、创建、编辑、删除、订阅、排序、显示状态与片单详情管理 |
| **反代管理** | 支持反代线路列表、只看自己、添加与删除 |
| **求片管理** | 支持求片列表、筛选、求片/取消求片、认领、催上片、详情与历史查询 |
| **商城管理** | 支持商品浏览、店铺详情、下单、订单查询、萝卜支付、关闭订单、催发货、申请开店、店铺信息更新、分类管理、商品管理、商户订单、发货与备注 |
| **支付管理** | 支持支付订单创建、支付页跳转、订单查询、关闭订单、服务商申请、服务商信息更新与服务商转账 |
| **观影历史** | 支持播放记录分页浏览、电影/剧集筛选、标记完成与删除记录 |
| **直播管理** | 独立直播管理页，支持直播库、直播频道与直播媒体源三层浏览、搜索、复制媒体地址与权限错误提示 |
| **修仙境界** | 根据萝卜余额展示当前境界、进度、下一境界与完整境界体系 |
| **社区工具** | 萝卜榜、上传榜、正在看榜、签到榜、萝卜记录、转赠萝卜、红包、抽奖、投票与播放记录工具入口 |
| **工具独立页面** | 红包、抽奖、投票已提供独立路由，支持创建、查询结果/记录和危险操作确认 |
| **封禁管理** | 提供封禁列表与封禁状态修改页面，作为权限敏感管理能力，不进入普通用户主导航 |
| **路由化控制台** | `/user` 下按一级功能域组织仪表盘、用户信息、媒体、上传、片单、反代、求片、商城、支付、社区等入口；直播、邀请、历史、境界、工具和管理页面作为对应功能区的二级入口 |
| **移动端适配** | 桌面端侧边栏，移动端使用顶部入口 + 底部抽屉导航 |
| **主题系统** | 支持 Light / Dark / System 明暗模式切换 |
| **Serverless Proxy** | 使用 Next.js Route Handler 代理 EMOS API，适配 Vercel / Cloudflare / EdgeOne Pages |

---

## 🧭 当前路由

<details>
<summary>展开查看当前路由</summary>

| 路由 | 说明 | 状态 |
| ---- | ---- | ---- |
| `/` | 登录页，包含网页授权登录与 Token 登录 | ✅ |
| `/user` | 用户仪表盘首页 | ✅ |
| `/user/profile` | 用户信息、账号操作与视频服登录设备管理 | ✅ |
| `/user/media` | 媒体库列表、影视搜索筛选、直播频道与播放源增删查改、音乐服务入口 | ✅ |
| `/user/media/[id]` | 媒体详情、季集结构、资源与字幕管理 | ✅ |
| `/user/upload` | 视频与字幕上传、自动匹配、上传队列和保存结果 | ✅ |
| `/user/watchlist` | 片单列表、搜索、创建、编辑、删除、订阅、排序与显示状态切换 | ✅ |
| `/user/watchlist/[id]` | 片单详情、视频列表、添加视频、动态 URL 与批量更新 | ✅ |
| `/user/proxy` | 反代线路列表、只看自己、添加与删除 | ✅ |
| `/user/seek` | 求片列表、筛选、求片、认领、催上片、详情与历史 | ✅ |
| `/user/shop` | 商城中心，支持商品浏览、我的订单、我的店铺、分类管理、商品管理与商户订单 | ✅ |
| `/user/shop/[sellerId]` | 店铺详情页，支持指定商户商品浏览、商品详情与下单 | ✅ |
| `/user/wallet` | 支付中心，支持订单创建、支付页跳转、查询、关闭、服务商申请、信息更新与转账 | ✅ |
| `/user/invite` | 邀请信息、邀请历史搜索、邀请用户与撤销邀请 | ✅ |
| `/user/community` | 排行榜、萝卜记录与社区工具入口 | ✅ |
| `/user/redpacket` | 红包工具，支持创建红包与查询领取记录 | ✅ |
| `/user/lottery` | 抽奖工具，支持创建抽奖、查看中奖列表、取消与停止 | ✅ |
| `/user/vote` | 投票工具，支持创建投票与查看已结束投票结果 | ✅ |
| `/user/ban` | 封禁管理，支持封禁列表与状态修改，需管理权限 | ✅ |
| `/user/history` | 观影历史、电影/剧集筛选、标记完成与删除记录 | ✅ |
| `/user/realm` | 修仙境界、萝卜进度与境界体系展示 | ✅ |

> 控制台路由目前采用客户端 Token 恢复与保护。未登录访问 `/user` 会返回登录页。

</details>

---

## 🚀 快速开始

### 环境要求

| 项目 | 版本 |
| ---- | ---- |
| Node.js | 22.x |
| pnpm | 建议 ≥ 10 |

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
│       ├── profile/page.tsx        # 用户信息、账号操作与视频服登录设备管理
│       ├── media/page.tsx          # 媒体库列表、直播频道、搜索、筛选与无限下拉
│       ├── media/[id]/page.tsx     # 媒体详情、季集结构、资源与字幕管理
│       ├── live/page.tsx           # 独立直播管理页，直播库、频道与媒体源浏览
│       ├── upload/page.tsx         # 视频与字幕上传、自动匹配、上传队列和保存结果
│       ├── watchlist/page.tsx      # 片单列表、创建、编辑、订阅与排序
│       ├── watchlist/[id]/page.tsx # 片单详情、视频管理、动态 URL 与批量更新
│       ├── proxy/page.tsx          # 反代线路列表、只看自己、添加与删除
│       ├── seek/page.tsx           # 求片列表、筛选、认领、催上片与历史
│       ├── shop/page.tsx           # 商城中心，买家与商户管理闭环
│       ├── shop/[sellerId]/page.tsx # 店铺详情、指定商户商品浏览与下单
│       ├── wallet/page.tsx         # 支付中心、订单管理、服务商申请与转账
│       ├── invite/page.tsx         # 邀请管理页
│       ├── community/page.tsx      # 排行榜、萝卜记录与社区工具入口
│       ├── redpacket/page.tsx      # 红包工具独立页
│       ├── lottery/page.tsx        # 抽奖工具独立页
│       ├── vote/page.tsx           # 投票工具独立页
│       ├── ban/page.tsx            # 封禁管理页，需管理权限
│       ├── history/page.tsx        # 观影历史、筛选、标记完成与删除记录
│       └── realm/page.tsx          # 修仙境界与境界体系展示
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
├── docs/
│   └── EMOS Web 功能补齐与治理计划.md # 功能补齐、信息架构与治理计划
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

<details>
<summary>展开查看已接入接口清单</summary>

| 模块 | 接口 |
| ---- | ---- |
| 登录校验 | `GET /api/sign/check` |
| 用户基础 | `GET /api/user`、`PUT /api/user/sign`、`GET /api/user/passwordTemporary`、`PUT /api/user/pseudonym`、`PUT /api/user/showEmpty`、`PUT /api/user/passwordReset`、`PUT /api/user/agreeUploadAgreement` |
| 视频服设备 | `GET /api/user/server/videoHistory`、`POST /api/user/server/videoLogout` |
| 邀请 | `POST /api/invite`、`POST /api/invite/emps`、`GET /api/invite/info`、`GET /api/invite/history`、`POST /api/invite/revoke` |
| 视频 | `PATCH /api/video/sync`、`GET /api/video/tree`、`GET /api/video/getVideoId`、`GET /api/video/list`、`GET /api/video/search`、`PUT /api/video/{video_id}/delete`、`GET /api/video/{video_id}/season`、`GET /api/video/{video_id}/episode`、`GET /api/video/persons` |
| 媒体资源 | `GET /api/video/media/list`、`DELETE /api/video/media/delete`、`PUT /api/video/media/move`、`PUT /api/video/media/rename`、`GET /api/video/media/playUrl` |
| 字幕 | `GET /api/video/subtitle/list`、`DELETE /api/video/subtitle/delete`、`PUT /api/video/subtitle/rename` |
| 上传 | `POST /api/upload/getUploadToken`、`GET /api/upload/video/base`、`POST /api/upload/video/save`、`POST /api/upload/subtitle/save` |
| 片单 | `POST /api/watch/slot`、`GET /api/watch`、`POST /api/watch`、`PUT /api/watch/{watch_id}/maintainer`、`DELETE /api/watch/{watch_id}`、`PUT /api/watch/{watch_id}/sort`、`PUT /api/watch/{watch_id}/show`、`GET /api/watch/{watch_id}/user`、`PUT /api/watch/{watch_id}/subscribe`、`GET /api/watch/{watch_id}/video`、`GET /api/watch/{watch_id}/video/search`、`POST /api/watch/{watch_id}/video/{video_id}`、`DELETE /api/watch/{watch_id}/video/{video_id}`、`DELETE /api/watch/{watch_id}/video/empty`、`PUT /api/watch/{watch_id}/dynamic`、`POST /api/watch/{watch_id}/video/update` |
| 反代线路 | `GET /api/proxy/line`、`POST /api/proxy/line`、`DELETE /api/proxy/line` |
| 求片 | `POST /api/seek`、`GET /api/seek/poll`、`PUT /api/seek/apply`、`GET /api/seek/query`、`GET /api/seek/history`、`PUT /api/seek/claim`、`PUT /api/seek/urge` |
| 排行榜 | `GET /api/rank/carrot`、`GET /api/rank/upload`、`GET /api/rank/userVideoRecordPlaying`、`GET /api/rank/sign` |
| 萝卜 | `GET /api/carrot/history`、`PUT /api/carrot/transfer` |
| 红包 | `POST /api/redPacket/create`、`GET /api/redPacket/receive` |
| 抽奖 | `POST /api/lottery/create`、`GET /api/lottery/win`、`PUT /api/lottery/cancel`、`PUT /api/lottery/stop` |
| 投票 | `POST /api/telegram/vote/create`、`GET /api/telegram/vote/result` |
| 直播 | `GET /api/live/library`、`GET /api/live/list`、`GET /api/live/media` |
| 商城 | `GET /api/shop/seller/base`、`POST /api/shop/seller/apply`、`POST /api/shop/seller/update`、`GET /api/shop/category/list`、`POST /api/shop/category/create`、`DELETE /api/shop/category/delete`、`PUT /api/shop/category/sort`、`GET /api/shop/product/list`、`GET /api/shop/product/info`、`POST /api/shop/product/createOrUpdate`、`DELETE /api/shop/product/delete`、`PUT /api/shop/product/sort`、`PUT /api/shop/product/category`、`PUT /api/shop/product/up`、`POST /api/shop/order/user/create`、`POST /api/shop/order/user/pay`、`GET /api/shop/order/user/list`、`PUT /api/shop/order/user/urge`、`POST /api/shop/order/user/close`、`DELETE /api/shop/order/user/order`、`GET /api/shop/order/shop/order`、`DELETE /api/shop/order/shop/order`、`PUT /api/shop/order/shop/delivery`、`POST /api/shop/order/shop/remark` |
| 支付 | `POST /api/pay/apply`、`GET /api/pay/base`、`POST /api/pay/update`、`POST /api/pay/transfer`、`POST /api/pay/create`、`GET /api/pay/query`、`PUT /api/pay/close` |
| 封禁 | `GET /api/ban/list`、`PUT /api/ban/change` |
| 观影记录 | `GET /api/video/record/list`、`PUT /api/video/record/change` |

所有请求通过本项目的 `/api/emos/[...path]` 代理到 `EMOS_API_BASE_URL`。分页响应统一读取文档约定的 `items / total / page / page_size`。

</details>

---

## 📜 许可证

[MIT License](LICENSE)
