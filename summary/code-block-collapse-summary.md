# 代码块折叠/展开 — 开发总结

## 功能

代码块超 10 行自动折叠，底部渐变遮罩 + 文字箭头按钮，点击展开/收起。

## 涉及文件

| 文件 | 操作 | 用途 |
|------|------|------|
| `assets/ts/custom.ts` | 新建 | JS：动态高度控制、transitionend 监听、reflow 动画、中英双语、aria 无障碍 |
| `assets/scss/custom.scss` | 追加 | CSS：渐变遮罩、分隔线、CSS 箭头、动画降级 |
| `layouts/partials/footer/custom.html` | 修改 | 修复已有 ToC CSS 选择器泄露 bug |

## 技术要点

- **渐变遮罩**：`.code-collapsed::after` 叠加 `linear-gradient(transparent 0% → var(--pre-background-color) 88%)`，高 96px，浅色/暗色自动适配
- **箭头**：纯 CSS `border-right + border-bottom` 1.5px 旋转 45°，`rotate(45deg) ↔ rotate(-135deg)` 翻转
- **高度控制**：JS 通过 `element.style` 接管 maxHeight，初始化快照到 320px
- **展开动画**：`maxHeight → scrollHeight`，transitionend 后设为 `'none'` 解除约束
- **收起动画**：`transition = none` 快照当前高度 → `getBoundingClientRect()` 强制 reflow → 动画到 320px
- **降级**：`window.matchMedia('(prefers-reduced-motion: reduce)')` 匹配时动画字符串为 `'none'`
- **双语**：读取 `<html lang>` 自动切换中/英文按钮文字

## 踩坑

1. `resources.Get` 返回 nil → 改用 `with` 包裹
2. `mask-image` 渐变观感差 → 换 `::after` 渐变叠加
3. 菱形边框不协调 → 改为细分隔线 + CSS 箭头
4. `::after` 遮罩相对错误祖先定位 → 给 `.highlight` 加 `position: relative`（JS 初始化时写入 `element.style`）
5. 纯 CSS max-height 动画展开后无法自适应内容变化 → JS transitionend 后设 `maxHeight: 'none'`
6. 收起时从 `'none'` 无法直接过渡 → 先快照 `scrollHeight`，强制 reflow 后再触发动画
7. ToC CSS `#TableOfContents > ul, ol` 选择器泄露，隐藏正文嵌套列表 → 加前缀限定作用域

## 设计

Observatory 风格：0.5px 细分隔线、CSS 箭头、微妙 hover 发光（`rgba(128,128,128,0.08)`），贴合粒子星空主题。
