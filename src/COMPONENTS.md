# Writing pages

Every page is one file in `src/pages/`. `node tools/build.mjs` turns them into the `.html` files at the repository root.
The executable reference for every component is `src/pages/styleguide.html` (built as `styleguide.html`). Copy structure from it.

## File format

```html
<!--
{
  "title": { "zh": "页面标题", "en": "Page title" },
  "description": { "zh": "一句话描述。", "en": "One-sentence description." },
  "section": "company",
  "post": { "kind": "research", "category": "compute", "date": "2026-11-23" }
}
-->
<section class="wrap"> … </section>
```

- `title` is the page's own name (the site name is appended automatically). `description` is one plain sentence, used in search results, post lists and cards, so write it as a summary a reader would want.
- `section` is one of `home`, `news`, `research`, `perspectives`, `commitments`, `company`, `practices`, `contact`, `legal` (or empty). It highlights the navigation and groups the site map.
- `post` only on news posts, essays and the core-views document. `kind`: `news`, `research` or `perspective`. `category`: a key in `src/data/site.json`.
- Exactly one `<h1>` per page. Heading levels descend without skipping.

## Two languages

- Text: `{{中文||English}}`. It may contain inline HTML (`<a>`, `<strong>`, `<b>`), but not another `{{ }}`. Wrap whole paragraphs: `<p>{{……||…}}</p>`. Never leave text outside `{{ }}` unless it is identical in both languages (an email address, "D1").
- Attributes: `placeholder="{{中文||English}}"`, `aria-label="{{…||…}}"`.
- Dates: `<!-- @date 2026-11-23 -->` prints the date in both languages.
- Chinese: space between Chinese and Latin letters or digits; 「」 for quotation; full-width punctuation. English: American spelling, sentence case headings.

## Page rhythm

- Wrap content in `<section class="wrap">` for the page gutters. Full-bleed bands (`.cta`, `.contactband`, `.band-dark`) sit outside any wrap and put a `.wrap` inside.
- Vertical space comes from `.section` (padding above and below). A section that directly follows the hero or another section uses `section section--flush-top` so space is not doubled.
- A hairline between two blocks: `<section class="section section--rule"><div class="wrap">…</div></section>` (the hairline is drawn at the top of the wrap).
- Do not write inline styles or new CSS. If a layout seems to need one, choose a different component.

## Components (see styleguide.html for the markup)

| Component | Use for |
|---|---|
| `hero` | top of every ordinary page: `<h1 class="hero__title">` left; `.hero__side` with one `.lead` (2–3 sentences) and at most one `.btn btn--primary` right |
| `statement` | a single large sentence instead of a hero (research: `statement statement--sans`; engineering: `statement statement--serif`), inside `<section class="wrap statement-block">` |
| `colset` + `cols` | 3, 4 or 5 short parallel points under a small `.label` heading (`cols cols--3`, `cols`, `cols cols--5`) |
| `panel` carousel | a set to page through one at a time (values, practices). Slides: `<article class="slide" data-slide>` with a `.plate plate--square` and `.slide__body` |
| `split` | a titled block: `.split__head` (h2, optional one-paragraph intro) and `.split__body` holding `.values`, `.deflist`, `.acc` accordions, `.steps`, `.linklist` or paragraphs |
| `steps` | only for a real sequence |
| `plate` | artwork: `<figure class="plate plate--wide"><!-- @plate kind=auto seed=unique-name ratio=16x9 --></figure>`. Ratios: `plate--hero` 2x1, `plate--wide` 16x9, `plate--land` 4x3, `plate--portrait` 4x5, `plate--square` 1x1. Give every plate its own seed. Always `kind=auto` |
| `feature` | one featured post: `<!-- @postfeature urls=page-name -->` |
| `rows` | the practices as large linked rows: `<!-- @practices audience=business -->`, `audience=founders` |
| `areas` | research areas with post counts: `<!-- @areas -->` (`exclude=engineering` to leave one out) |
| post table | `<!-- @posttable title="{{全部文章||All news}}" tabs=news -->`; narrow with `kind=research,perspective` or `category=validation,founders`; give each table on a page its own `id=` |
| post gallery | `<!-- @postgallery kind=research filter=areas -->` |
| post teasers / lead | `<!-- @postteasers urls=a,b -->`, `<!-- @postlead urls=a -->` (news page) |
| dark carousel | `<section class="band-dark"><div class="wrap"><!-- @postcarousel urls=a,b,c tone=dark --></div></section>`; without `tone=dark` for a light one |
| `tiles` tabs | a hub with 2–3 sections switched in place |
| `emptybox` | an honest empty state |
| `dochead` + `doc` | long documents, policies, legal pages and articles: head, then a sticky side column (`.toc` contents, or a `.deflist` of facts) and a `.prose` body. Wrap each part of the body in `<section id="…">` with its `<h2>` so the contents list can follow the reader |
| `summary` | the short list at the top of a long document |
| `metastrip` | effective date, type, audience under a legal or policy title |
| `doccard`, `changelog` | current version and dated changes |
| `note` | a plain disclaimer |
| `cta` | the dark closing band: one question or statement and one `.btn btn--light` |
| `contactband` | dark band with three contact entries |
| Icons | `<!-- @icon arrow-right -->`; names: arrow-right, arrow-left, arrow-up-right, chevron-down, search, menu, close, download, mail |

## Article skeleton

```html
<section class="wrap">
  <header class="dochead dochead--article">
    <!-- @posthead -->
    <h1 class="dochead__title">{{标题||Title}}</h1>
    <p class="lead">{{导语，一到两句。||A lead of one or two sentences.}}</p>
  </header>
  <div class="article-plate"><figure class="plate"><!-- @plate kind=auto seed=page-name ratio=5x2 --></figure></div>
  <div class="doc">
    <nav class="doc__side" data-toc aria-label="{{本文内容||On this page}}">
      <span class="label">{{本文内容||On this page}}</span>
      <ol class="toc toc--plain">
        <li><a href="#part-1"><span>{{第一部分||First part}}</span></a></li>
      </ol>
    </nav>
    <article class="doc__body prose">
      <section id="part-1">
        <h2>{{第一部分||First part}}</h2>
        <p>{{……||…}}</p>
      </section>
    </article>
  </div>
  <!-- @related -->
</section>
```

A short news post with no subheadings uses `<aside class="doc__side">` holding a `.deflist` of facts (发布日期 Published, 分类 Category, 发布方 Published by) in place of the contents list, and paragraphs directly inside `.prose`.

For a numbered policy or legal document, use `<ol class="toc">` with `<span class="toc__num">01</span>` and put `<span class="num">01</span>` at the start of each `<h2>`.
