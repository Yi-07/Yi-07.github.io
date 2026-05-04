---
title: '个人博客搭建及托管（Hugo + Github）'
description: Hugo 是一个用 Go语言 编写的静态网站生成器，配合 GitHub Pages 的免费托管，可以把你的 Markdown 文件变成一个在线博客
date: '2026-04-27T22:47:24+08:00'
slug: BlogSiteBuilt
image: images/image0.png
---

## 搭建准备

1. 安装[hugo](https://github.com/gohugoio/hugo/releases "hugo源码仓库")  (根据你所用的电脑配置来按需安装对应版本，我这里用的Windows系统，hugo版本用的当前最新版本：[v0.160.1](https://github.com/gohugoio/hugo/releases/tag/v0.160.1) )

   ![image1](images\image1.png)

2. 安装[hugo theme](https://themes.gohugo.io/ "hugo主题库")（这里我选用[Stack主题](https://github.com/CaiJimmy/hugo-theme-stack "stack主题源码仓库") ，版本按需选择，这里我选择v3大版本中最新的稳定版本[v3.34.2 ](https://github.com/CaiJimmy/hugo-theme-stack/releases/tag/v3.34.2) ）

   ![image2](images\image2.png)

3. 安装[git]([Git](https://git-scm.com/) "Git官网") ，并注册一个[Github](https://github.com/ "Github官网")账号（本教程略）

4. 上面装的hugo需要配置环境变量才可全局访问（git的安装向导会提示你设置全局，也可以手动设置，操作同hugo），以windows为例，打开开始菜单搜索`编辑系统环境变量` ，点击$环境变量 \rightarrow Path(用户变量)$ $ \rightarrow 新建$$ \rightarrow 填写安装好的hugo文件路径$$ \rightarrow 确定*3$

   ![image3](images\image3.png)

   `win+r` 用输入命令`cmd`打开命令提示符 ,输入命令 `hugo version` 和`git -v`验证一下是否成功，成功后有版本号输出

   ![image4](images\image4.png)

## 搭建流程

下面的操作是我参考b站UP主 [Letere-莱特雷](https://www.bilibili.com/video/BV1bovfeaEtQ?spm_id_from=333.788.videopod.sections&vd_source=b1e2460771cdfeeedfc430c3edea4cd6) 的教程搭建的，当然你也可以按照[官方文档](https://gohugo.io/getting-started/quick-start/)的最新教程来操作

### 创建本地 hugo 博客项目

```cmd
# 1.创建项目框架 dev (在你期望的的路径下操作，我这里路径为"D:\mydocument\myblog")
hugo new site dev

# 2.进入到dev目录下
cd dev 

# 3.初始化git仓库（方便管理项目版本，同时后面会用git推送到Github仓库里）
git init

# 4.①将安装解压好的主题 Stack 放到 themes/Stack 目录下
# 4.②也可以通过git命令安装 git submodule add https://github.com/CaiJimmy/hugo-theme-stack.git themes/Stack

# 5.在项目配置文件中添加一行，指示当前主题
echo "theme = 'Stack'" >> hugo.toml

# 6.向项目中添加一个新页面（后面创建博客页面也是如此）
hugo new content content/posts/my-first-post.md

# 7.使用编辑器打开文件my-first-post.md，你会看到自动生成的前言，如下图，你可以在前言下方书写你的草稿（Markdown代码），但请不要随意改动引言的内容或删除，否则可能会出现一些问题，如果你想改动，可以去研究一下官方文档 https://gohugo.io/content-management/front-matter/
```

![image5](images\image5.png)

```cmd
# 8.启动 hugo 服务
hugo server -D
```

完成上面的步骤你就已经搭建好你的本地博客站点啦

### Github托管部署
