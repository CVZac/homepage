# 云想亿创集团 CV-Etron Group 官网

> 以人为核，智能环绕。People at the core. Intelligence in orbit.

多页面静态网站，中英双语。结构与节制感参考 [anthropic.com](https://www.anthropic.com/)，文字、标识、字体和图版都是自己的。

仓库根目录下的 `.html` 文件就是成品，可以直接上传到任何静态托管服务，也可以双击 `index.html` 在浏览器里打开。

## 网站结构

导航对应 Anthropic 官网的架构：新闻、研究、观点、承诺、公司，加上「联系我们」、站内搜索和全屏菜单；页脚是按栏目折叠的深色页脚。

| 栏目 | 页面 | 文件 |
|---|---|---|
| 首页 | 一句话主张、轨道图、三张公告卡、四张「进一步了解」 | `index.html` |
| 新闻 | 新闻首页（头条、专题轮播、可筛选的文章表） | `news.html` |
| | 三篇公告 | `news-new-website.html` `news-cv-etron-group.html` `news-five-practices.html` |
| 研究 | 研究首页（方向、精选轮播、文章画廊） | `research.html` |
| | 工程实践 | `engineering.html` |
| | 五篇文章 | `research-size-the-workload.html` `research-buy-rent-share.html` `research-validate-before-building.html` `research-before-you-raise.html` `engineering-before-launch.html` |
| 观点 | 观点概览 | `perspectives.html` |
| | 我们对 AI 落地的核心看法（长文） | `core-views.html` |
| 承诺 | 服务准则 | `charter.html` |
| | 负责任交付政策（部署等级 D1–D4） | `responsible-delivery.html` |
| | 透明度 | `transparency.html` |
| | 安全与合规 | `security.html` |
| 公司 | 关于我们 | `company.html` |
| | 团队、招聘、活动 | `team.html` `careers.html` `events.html` |
| | 创业未来 | `founder-futures.html` |
| 业务 | 业务总览 | `practices.html` |
| | 五条业务线 | `practice-infrastructure.html` `practice-compute.html` `practice-validation.html` `practice-capital.html` `practice-founders.html` |
| 联系 | 联系我们（邮件表单） | `contact.html` |
| 条款 | 隐私政策、服务条款 | `privacy.html` `terms.html` |
| 其他 | 站内搜索、网站地图、404、组件样例 | `search.html` `sitemap.html` `404.html` `styleguide.html` |

这一版按要求没有收录产品价格和产品案例。

## 待确认的内容

下面这些文字是我起草的，请在正式上线前逐项确认或修改。

**对外承诺。** 这些页面是以集团名义作出的公开承诺，每一句都应该是你们确实愿意遵守的：

- `charter.html` 服务准则：四条优先顺序，以及数据、交付、上线后、与创业者合作、不做的事。
- `responsible-delivery.html` 负责任交付政策：D1–D4 四个部署等级的要求、上线前六步检查、出现问题时的做法。
- `security.html`：安全做法和「报告安全问题」的流程。
- `transparency.html`：其中「我们怎样使用 AI」一条写的是「全程使用 AI 工具，交给客户的内容由人复核」。
- 这几份文件的版本号（1.0）和生效日期（2026-11-23）。

**法律文件。** `privacy.html` 和 `terms.html` 需要法务审核。隐私政策对网站本身的描述是准确的（无 Cookie、无统计脚本、无第三方请求、只在浏览器保存语言选择），但「适用法律」「免责声明」等条款请由法务确认。

**文章与观点。** 五篇研究文章和 `core-views.html` 是以集团名义发表的观点，没有引用数据或研究，全部是推理和通行做法。请确认它们代表你们的看法。文章统一标注为 2026-11-23 发布。

**关于公司的陈述。**

- `team.html`：「小而资深的团队」「成员来自互联网行业」「每次合作有一位负责人」「不在网站上列出成员名单」。
- `careers.html`：「不在网站上列出固定职位」「每一封来信都会读」。
- `events.html`：目前显示「没有公开活动」。
- `company.html`：六条价值观的措辞。

**日期。** 三篇公告的日期按网站的实际变更记录：五条业务线 2026-11-08，启用集团名称 2026-11-10，新官网上线 2026-11-23。如果对外口径不同，请修改。

**没有做的栏目。** Anthropic 官网里有几处在我们这里没有可以如实填写的内容，所以没有做：领导团队名单、客户案例、公益报告、投资者关系、模型与产品页、系统状态页、社交媒体链接。有了真实内容后可以按现有版式补上。

## 修改内容

页面源文件在 `src/pages/`，一个页面一个文件。改完后运行：

```bash
node tools/build.mjs
```

脚本会重新生成根目录下的全部 `.html`、`assets/site.css`、`assets/site.js` 和搜索索引，并检查断链、中英文是否成对、标题层级等问题。只需要 Node.js，不需要安装任何依赖。

写法说明在 [`src/COMPONENTS.md`](src/COMPONENTS.md)，所有版式组件的样例在 `styleguide.html`（源文件 `src/pages/styleguide.html`）。要点：

- 文字写成 `{{中文||English}}`，日期写成 `<!-- @date 2026-11-23 -->`。
- 新增一篇文章：在 `src/pages/` 新建文件，文件头里写上 `"post": { "kind": "research", "category": "compute", "date": "…" }`。新闻表、研究画廊、相关文章和搜索会自动收录。
- 导航、页脚和全屏菜单在 `src/partials/`。
- 五条业务线的名称和描述、文章分类在 `src/data/site.json`。
- 联系邮箱 `sales@cv-etron.com` 写在 `src/data/site.json` 和若干页面里，全局搜索即可一次找全。

## 双语

- 每个页面同时包含中文和英文，由 `<html lang>` 决定显示哪一种。
- 语言来源依次是：网址里的 `?lang=en` 或 `?lang=zh`、访客上次的选择（保存在浏览器本地）。默认英文；访客点右上角「中文」切换后会被记住。
- 中文入口可以直接链接 `index.html?lang=zh`。
- 中文标题只在词与词之间折行（构建时用分词插入断行点），不会把「问题」拆成两行。

## 视觉

- **配色**：宣纸白 `#F6F5F1` 打底，墨色 `#16181C` 作文字，石色 `#ECEBE5` 作卡片与图版底色，页脚夜色 `#0E1013`。唯一的强调色是青金蓝 `#1E3FA8`，只用在标识的电子、键盘焦点和首屏轨道图的一个天体上。色值集中在 `src/styles/10-base.css` 开头。
- **字体**：标题用无衬线粗体，导语和首页主张的后半句用衬线体。西文是 Schibsted Grotesk 和 Newsreader，中文是思源黑体 Bold 和思源宋体 Medium，全部开源（SIL OFL），由本站提供，不依赖 Google Fonts。正文中文使用系统字体（苹方、微软雅黑等）。
- **图版**：全站的插图都是构建时用代码画出来的轨道图（`tools/plates.mjs`），每一张对应它的内容。例如首屏是「人在核心，五条业务线沿五条轨道环绕」，负责任交付政策是四层逐级加密的阴影，融资对接是一次变轨。图版有纸纹和版框，方角；界面元素（按钮、卡片）是圆角。
- **动效**：只有首屏轨道图里的天体在缓慢运行，可以暂停；离开视野或切到其他标签页时停止；访客开启「减少动态效果」时保持静止。

## 字体子集

中文字体文件很大，所以只保留网站实际用到的字。**修改了标题或导语里的中文之后**，需要重新生成字体，否则新出现的字会回退到系统字体（不会出错，只是字形略有不同）：

```bash
node tools/fonts.mjs --src <存放源字体的文件夹>
```

源字体不在仓库里。需要四个文件，文件名见 `tools/fonts.json`：

- `SchibstedGrotesk.woff2`、`Newsreader.woff2`：npm 包 `@fontsource-variable/schibsted-grotesk`、`@fontsource-variable/newsreader` 里的 `latin-wght-normal` / `latin-opsz-normal` 文件。
- `NotoSansSC-700.ttf`、`NotoSerifSC-500.ttf`：npm 包 `@expo-google-fonts/noto-sans-sc`（700Bold）和 `@expo-google-fonts/noto-serif-sc`（500Medium）里的 TTF。

运行需要 Playwright（用来读取页面实际用到的字）和 Python 的 `fonttools`、`brotli`。

## 隐私与技术

- 纯静态页面。不使用 Cookie、统计脚本或跟踪工具，不向第三方发起请求。
- 联系表单在访客自己的邮件应用里生成邮件，不向任何服务器发送内容。
- 站内搜索在浏览器里完成，索引是 `assets/search-index.js`。
- 支持键盘操作和读屏软件；所有交互组件都有对应的 ARIA 状态。
- 页面宽度 360px 到 1920px 均已检查，无横向滚动。

## 部署

任意静态托管都可以：

- **GitHub Pages**：仓库 Settings → Pages → 选择分支，根目录。
- **国内服务器或对象存储**（阿里云 OSS、腾讯云 COS 等）：上传根目录下的全部 `.html` 和 `assets/` 文件夹，绑定域名。`src/` 和 `tools/` 不需要上传。

网站目前不显示 ICP 备案号。如果部署在中国大陆的服务器上并使用备案域名，法规要求在页脚展示备案号，届时在 `src/partials/footer.html` 的版权行下方加回即可。
