# Handraw Gallery — RuiC-PoseAtlas（标准图库插件适配仓）

本仓库将开源项目 [HRuiCcc/RuiC-PoseAtlas](https://github.com/HRuiCcc/RuiC-PoseAtlas)（MIT License）的 3 套视觉参考图鉴转换为 **手绘风标准扩展图库清单（Format 1 `gallery.json`）**，以便通过通用标准接口接入 [手绘风扩展图库市场（handraw-galleries）](https://github.com/yang0/handraw-galleries)，客户端无需任何专属硬编码解析器。

- **GitHub 仓库**：https://github.com/yang0/handraw-gallery-ruic-poseatlas
- **Gitee 国内镜像**：https://gitee.com/yang02010/handraw-gallery-ruic-poseatlas

## 包含的标准图库清单

| ID | 名称 | 清单文件 | 说明 |
| --- | --- | --- | --- |
| `ruic-poses` | 姿态图鉴 | [`galleries/ruic-poses.json`](galleries/ruic-poses.json) | 288 组人体姿态 × 5 视角（正面/斜侧/侧面/俯视/仰视）标准多变体清单 |
| `ruic-costumes` | 衣装图鉴 | [`galleries/ruic-costumes.json`](galleries/ruic-costumes.json) | 1,407 套无人物服饰单品图鉴 |
| `ruic-faces` | 人像图鉴 | [`galleries/ruic-faces.json`](galleries/ruic-faces.json) | 1,499 张正面脸部与造型参考 |

每个清单均内置 `imageMirrors`（同时声明 Gitee 国内镜像与 GitHub 原仓地址），客户端按需下载图片并仅缓存在本机，且当主镜像不可用时自动切换备用镜像。

## 从上游重新生成

```bash
node scripts/sync_from_upstream.mjs
```

## 版权与致谢

- 图鉴原始素材与元数据归原作者 [HRuiCcc/RuiC-PoseAtlas](https://github.com/HRuiCcc/RuiC-PoseAtlas) 所有，遵循 MIT License。
- 本仓库仅提供符合 Handraw Standard Gallery Format 1 接口规范的清单转换与镜像索引。
