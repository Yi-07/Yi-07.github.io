# 代码块过长折叠/展开 — 开发进度总结

## 需求概述

Hugo + Stack 主题博客站点，为超过 10 行的代码块添加折叠/展开功能：

- 代码块行数 > 10 时自动折叠，底部显示渐变遮罩（透明 → 代码块背景色）
- 三角形边框包裹的下拉图标居中置于代码块下方
- 点击展开：三角形 + 图标整体逆时针旋转 180°，渐变遮罩消失，代码块平滑展开
- 点击收起：三角形 + 图标整体顺时针旋转 180°，渐变遮罩重现，代码块折叠

---

## 技术调研

### 项目代码块渲染链路

| 环节 | 实现 |
|------|------|
| Markdown 解析 | Hugo Goldmark → 内置 Chroma 高亮 |
| HTML 结构 | `<div class="highlight"><div class="chroma"><table class="lntable">...` |
| 行号 | `lineNos: true` + `lineNumbersInTable: true`，行元素为 `span.line` |
| 样式 | 主题 `article.scss` + Chroma 双主题（Monokai/Monokailight） |
| JS 注入点 | 主题 `script.html` 自动加载 `assets/ts/custom.ts`（如存在） |

### 主流设计模式调研

- **渐变遮罩**：Stripe、Trunk.io 等使用 CSS mask-image 或 ::after 叠加渐变层
- **交互模式**：折叠态固定高度 + 底部渐变 + 展开/收起按钮
- **动画方案**：max-height transition（兼容性最好）、grid-template-rows（现代方案）
- **无障碍**：aria-expanded、键盘操作、prefers-reduced-motion

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `assets/ts/custom.ts` | 新建 | JS 逻辑：检测行数、注入按钮、处理点击切换 |
| `assets/scss/custom.scss` | 追加 100 行 | 折叠/展开样式、渐变遮罩、三角形边框、旋转动画 |
| `layouts/partials/footer/custom.html` | 修改 3 处 | 添加 icon URL meta 标签、修复 ToC CSS 选择器泄露 |

---

## 实现细节

### 1. JavaScript（`assets/ts/custom.ts`）

```
DOMContentLoaded + 100ms 延迟
├── 查找 .article-content（非文章页直接退出）
├── 读取 <meta name="code-expand-icon"> 获取 icon URL
├── 遍历所有 div.highlight
│   ├── 统计 span.line 数量（Chroma 行号模式）
│   ├── 行数 ≤ 10 → 跳过
│   └── 行数 > 10
│       ├── 添加 .code-collapsed 类
│       ├── 创建 <button class="code-expand-btn">
│       │   └── <span class="code-expand-toggle">
│       │       └── <img class="code-expand-icon">
│       └── 绑定 click 事件
│           ├── 折叠 → 展开：移除 .code-collapsed，添加 .code-expanded
│           │   aria-expanded="true", aria-label="收起代码"
│           └── 展开 → 折叠：移除 .code-expanded，添加 .code-collapsed
│               aria-expanded="false", aria-label="展开代码"
```

### 2. CSS（`assets/scss/custom.scss` 追加部分）

**折叠状态**（`.code-collapsed`）：
- `max-height: 340px` + `overflow: hidden`
- `::after` 叠加渐变层：`linear-gradient(to bottom, transparent 0%, var(--pre-background-color) 100%)`
- 渐变高度 88px，`pointer-events: none` 保证文字可选
- 浅色模式淡入 `#fafafa`，暗色模式淡入 `#272822`（通过 CSS 变量自动适配）

**展开状态**（`.code-expanded`）：
- `max-height: 20000px`，无渐变遮罩

**三角形边框按钮**：
- `.code-expand-toggle` — 包裹三角形 + 图标的整体旋转单元
  - `::before`：外层三角形（边框色 `--card-text-color-tertiary`），高 34px，宽 52px
  - `::after`：内层三角形（填充色 `--card-background`），高 30px，宽 46px，下移 3px
- `.code-expand-icon`：图标 15×15px，绝对定位于三角形内部（`top: 16px`）
- 展开时 `.code-expand-toggle` 整体 `rotate(-180deg)`
- Hover：边框色加深，图标透明度 0.45 → 0.8
- Focus-visible：三角形外围 accent 色光环

**动画参数**：
- 展开：`max-height 0.45s ease`
- 旋转：`transform 0.35s ease`
- `prefers-reduced-motion: reduce` 时禁用所有 transition

---

## 踩坑记录

### 问题 1：`$codeMoreIcon` undefined variable

**现象**：Hugo 构建报错 `undefined variable "$codeMoreIcon"`

**原因**：`resources.Get "icons/codeMore.png"` 返回 nil 时，使用 `:=` 赋值的变量无法访问 `.RelPermalink`

**修复**：改用 `{{- with resources.Get "icons/codeMore.png" -}}` 包裹，资源不存在时什么都不输出

### 问题 2：渐变遮罩在浅色/暗色模式下观感不佳

**现象**：浅色模式有"反光"感，暗色模式过渡生硬

**原因**：使用了 `mask-image: linear-gradient(to bottom, #000 75%, transparent 100%)`，mask-image 通过亮度遮罩裁剪内容，最终露出 `--pre-background-color`，但过渡缺乏中间色调缓冲

**修复**：放弃 mask-image，改用 `.code-collapsed::after` 叠加渐变层：
```css
background: linear-gradient(to bottom, transparent 0%, var(--pre-background-color) 100%);
```
渐变终点使用 CSS 变量 `--pre-background-color`，自动适配双模式

### 问题 3：菱形边框改为三角形边框

**现象**：用户反馈菱形（旋转正方形）视觉效果不佳

**修复**：用两个 CSS border 三角形叠加实现镂空三角形边框：
- 外层三角形（`::before`）：CSS border 技巧，border-top 颜色为边框色
- 内层三角形（`::after`）：略小 + 下移偏移，border-top 颜色为背景色
- 两者叠加产生边框效果

### 问题 4：图标不在三角形内部、旋转不同步

**现象**：下拉图标位于三角形下方而非内部，且旋转时只有图标转动，三角形不动

**原因**：三角形伪元素在 button 上，图标是 button 的子元素，两者独立

**修复**：新增 `<span class="code-expand-toggle">` 包裹层：
- 三角形伪元素移到 `.code-expand-toggle` 上
- 图标绝对定位于 toggle 内部（`top: 16px`，坐落在三角形中心偏下）
- 旋转目标从 `.code-expand-icon` 改为 `.code-expand-toggle`，三角形 + 图标整体旋转

### 问题 5：博客正文无序列表不渲染

**现象**：HTML 源码中有 `<ul>` 元素，但页面不显示，浏览器 Console 无 JS 报错

**原因**：`footer/custom.html` 中已有的 ToC 样式存在 CSS 选择器泄露：
```css
/* 原代码：逗号导致 ol 匹配了全页所有 <ol> */
#TableOfContents > ul, ol {  /* ← "ol" 泄露到全局 */
    ul, ol { display: none; } /* 编译为 ol ul, ol ol { display: none } */
}
```
`ol ul { display: none }` 隐藏了文章正文中所有嵌套在 `<ol>` 里的 `<ul>`

**修复**：所有选择器加 `#TableOfContents` 前缀，严格限定作用域：
```css
#TableOfContents > ul ul,
#TableOfContents > ul ol,
#TableOfContents > ol ul,
#TableOfContents > ol ol { display: none; }
#TableOfContents .open { display: block; }
```

---

## 最终效果

- 超过 10 行的代码块自动折叠至 ~340px，底部 88px 渐变淡出
- 三角形边框包裹的下拉图标居中对齐，hover 时边框色加深
- 点击后三角形 + 图标整体逆时针 180° 旋转，代码块平滑展开
- 再次点击顺时针 180° 旋转回原位，代码块折叠
- 浅色/暗色模式自动适配渐变颜色
- `prefers-reduced-motion: reduce` 时禁用动画
- 支持键盘操作（focus-visible 光环提示）、aria-expanded 状态声明

---

## 后续优化建议

1. **滚动定位**：展开时将代码块顶部滚动到视口内；收起时如按钮不在视口内则滚动定位
2. **状态持久化**：通过 localStorage 记住用户展开/收起偏好
3. **移动端适配**：三角形和图标尺寸可适当缩小，折叠高度可降低
4. **性能**：大量代码块时考虑 IntersectionObserver 延迟初始化
