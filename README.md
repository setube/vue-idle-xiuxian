# 我的放置仙途

<p align="center">
    <img src="https://i0.hdslb.com/bfs/article/c5bd547efa79470ccaab206c22b694c48941412.png" width="400">
</p>
<p align="center">
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license MIT"></a>
    <a href="https://qm.qq.com/q/iifNs5qukg"><img src="https://img.shields.io/badge/QQ%E7%BE%A4-920930589-green" alt="QQ群：920930589"></a>
</p>

## 技术栈

- **前端框架**: [Vue.js](https://cn.vuejs.org)
- **语言**: TypeScript（严格类型检查）
- **包管理与测试**: [Bun](https://bun.sh)
- **构建工具**: [Vite](https://cn.vite.dev)
- **状态管理** [Pinia](https://pinia.vuejs.org/zh)
- **UI 组件库** [Naive UI](https://www.naiveui.com/zh-CN)

## 主要功能

- [x] 角色系统
- [x] 奇遇系统
- [x] 探索系统
- [x] 背包系统
- [x] 成就系统
- [x] 灵宠系统
- [x] 灵宠养成系统
- [x] 装备系统
- [x] 装备养成系统
- [x] 抽奖系统
- [x] 炼丹系统
- [x] 设置系统
- [x] 数据管理系统
- [x] GM 系统

## Docker-Compose 安装部署

```bash
version: '3.9'
services:
    vue-idle-xiuxian:
        image: kowming/vue-idle-xiuxian:latest
        container_name: xiuxian
        restart: unless-stopped
        ports:
            - 8183:8080
        tty: true
        stdin_open: true
```

## 本地开发与部署

安装 Bun 1.4.5 或更新版本。依赖使用提交的 `bun.lock`，开发、测试、CI 和 Docker 统一使用 Bun。

```bash
# 安装依赖
bun install --frozen-lockfile

# 开发环境运行
bun run dev

# 严格类型检查与回归测试
bun run check

# 构建生产版本
bun run build

# 本地预览
bun run preview
```

构建结果输出至 `dist/`，不纳入源码提交。提交到 `main` 后，GitHub Actions 会安装 Bun 依赖、运行类型检查和回归测试、构建站点，并自动部署到 GitHub Pages。Pull request 只运行检查和构建，不会发布站点。GitHub Pages 自定义域名留在仓库设置中；Pages 会在 Actions 部署时使用仓库中已配置的域名，无须在 `public/` 添加或生成 CNAME 文件。

从当前源码构建 Docker 镜像：

```bash
docker build -t vue-idle-xiuxian:1.1.1 .
docker run --rm -p 8183:8080 vue-idle-xiuxian:1.1.1
```

依赖升级至本次发布时的最新兼容稳定版本；TypeScript 使用和 Vue 类型检查器兼容的 6.0 系列。

## 存档与升级

升级前可在设置中导出存档。1.1.0 会把旧版 IndexedDB 存档一次性迁移至 Pinia 持久化状态，完成后移除旧数据，并保留独立 AES 存档的导入能力。读取旧档时会合并相同灵草、移除派生字段和过期丹药效果。新存档只保存玩家状态，灵草按数量堆叠。

灵力容量按当前境界修炼所需资源计算，至少容纳一整个境界的突破消耗；日月丹可提高容量。旧存档中已超过容量的灵力会保留。

项目于 2026 年 11 月发布 1.1.1，新增可配置的数据同步间隔，默认每 5 秒同步一次。间隔越短，同步越及时，但性能开销越高。具体变更见 [CHANGELOG.md](CHANGELOG.md)。

## 社区与安全

- 参与开发前请阅读[贡献指南](CONTRIBUTING.md)。
- 社区交流遵循[行为准则](CODE_OF_CONDUCT.md)。
- 安全问题请依照[安全政策](SECURITY.md)私下报告。

## 鸣谢

感谢以下开源项目的支持：

- Vue.js - 渐进式 JavaScript 框架
- Vite - 下一代前端构建工具
- Naive UI - Vue3 组件库
- Pinia - Vue 状态管理库

## 版权声明

Copyright © 2025 我的放置仙途

本项目采用 MIT 许可证。详情请参阅 LICENSE 文件。

```
MIT License

版权所有 (c) 2025 我的放置仙途

特此免费授予任何获得本软件和相关文档文件（"软件"）副本的人不受限制地处理本软件的权利，
包括但不限于使用、复制、修改、合并、发布、分发、再许可和/或出售本软件副本的权利，
以及允许获得本软件的人这样做，但须符合以下条件：

上述版权声明和本许可声明应包含在本软件的所有副本或重要部分中。

本软件按"原样"提供，不提供任何形式的明示或暗示的保证，包括但不限于对适销性、特定用途的
适用性和非侵权性的保证。在任何情况下，作者或版权持有人均不对任何索赔、损害或其他责任负责，
无论是在合同诉讼、侵权行为或其他方面，由软件或软件的使用或其他交易引起、产生或与之相关。
```
