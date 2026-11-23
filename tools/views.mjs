// Generated fragments. Each export is a directive usable in pages as <!-- @name key=value -->.
// They receive (args, ctx, page) and return HTML that may itself contain {{中文||English}} and directives.
import { renderPlate, heroWide, heroTall } from './plates.mjs';

const ICONS = {
  'arrow-right': '<path d="M3.5 10h13M11.5 5l5 5-5 5"/>',
  'arrow-left': '<path d="M16.5 10h-13M8.5 5l-5 5 5 5"/>',
  'arrow-up-right': '<path d="M6 14L14 6M7.5 6H14v6.5"/>',
  'chevron-down': '<path d="M5 7.5l5 5 5-5"/>',
  search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2L17 17"/>',
  menu: '<path d="M3.5 6.5h13M3.5 10h13M3.5 13.5h8"/>',
  close: '<path d="M5 5l10 10M15 5L5 15"/>',
  download: '<path d="M10 3.5v9M6 9l4 4 4-4M4 16.5h12"/>',
  mail: '<rect x="3" y="5" width="14" height="10" rx="1.5"/><path d="M3.5 6l6.5 5 6.5-5"/>',
  pause: '<path d="M7 5v10M13 5v10"/>',
  play: '<path d="M7 4.5v11l9-5.5z"/>',
  grid: '<rect x="3.5" y="3.5" width="5.5" height="5.5"/><rect x="11" y="3.5" width="5.5" height="5.5"/><rect x="3.5" y="11" width="5.5" height="5.5"/><rect x="11" y="11" width="5.5" height="5.5"/>',
  list: '<path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"/>',
};
export const iconSvg = (name) => {
  if (!ICONS[name]) throw new Error(`unknown icon "${name}"`);
  return `<svg class="icon" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
};
export const icon = (args) => iconSvg(args._[0] || args.name);

const cat = (ctx, key) => { const c = ctx.site.categories[key]; return ctx.t(c.zh, c.en); };
const tt = (ctx, o) => ctx.t(o.zh, o.en);
const groupOf = (p) => (p.kind === 'news' ? p.category : 'ideas');
const plateFor = (p, ratio) => renderPlate({ kind: (p.plate && p.plate.kind) || 'auto', seed: (p.plate && p.plate.seed) || p.url, ratio });
const meta = (ctx, p) => `<p class="meta"><span class="meta__cat">${cat(ctx, p.category)}</span>${ctx.dateHtml(p.date)}</p>`;

function pick(ctx, args) {
  let list = ctx.posts;
  if (args.kind) { const k = args.kind.split(','); list = list.filter((p) => k.includes(p.kind)); }
  if (args.category) { const c = args.category.split(','); list = list.filter((p) => c.includes(p.category)); }
  if (args.urls) { const u = args.urls.split(',').map((s) => s.trim() + '.html'); list = u.map((x) => ctx.posts.find((p) => p.url === x)).filter(Boolean); }
  if (args.exclude) list = list.filter((p) => p.url !== args.exclude + '.html');
  if (args.limit) list = list.slice(0, Number(args.limit));
  return list;
}

export const heroart = () => heroWide() + heroTall();

// ---- meta row for an article page, from its own front matter ----
export function posthead(args, ctx, page) {
  const p = ctx.posts.find((x) => x.url === page.name + '.html');
  if (!p) throw new Error(`${page.name}: @posthead used on a page without "post" front matter`);
  return meta(ctx, p);
}

// ---- table of posts with filter tabs, sort and search ----
export function posttable(args, ctx) {
  const list = pick(ctx, args);
  const tabs = args.tabs === 'news'
    ? [['all', '全部', 'All'], ['company', '公司', 'Company'], ['practices', '业务', 'Practices'], ['ideas', '研究与观点', 'Research and perspectives']]
    : null;
  const rows = list.map((p, i) => `
      <li class="ptable__row" data-post data-groups="${groupOf(p)} ${p.category}" data-date="${p.date}" data-order="${i}">
        <a class="ptable__link" href="${p.url}">
          <span class="ptable__title">${tt(ctx, p.title)}</span>
          <span class="ptable__desc">${tt(ctx, p.description)}</span>
          <span class="ptable__cat">${cat(ctx, p.category)}</span>
          <span class="ptable__date">${ctx.dateHtml(p.date)}</span>
        </a>
      </li>`).join('');
  const id = args.id || 'posts';
  return `
  <div class="postlist" data-postlist id="${id}">
    ${args.title ? `<div class="postlist__head"><h2 class="h1">${args.title}</h2>${tabs ? `<div class="seg" role="group" aria-label="{{筛选||Filter}}">${tabs.map(([k, zh, en], i) => `<button type="button" class="seg__btn" data-filter="${k}" aria-pressed="${i === 0}">{{${zh}||${en}}}</button>`).join('')}</div>` : ''}</div>` : ''}
    <div class="postlist__bar">
      <p class="postlist__count"><span data-post-count>${list.length}</span> {{篇文章||articles}}</p>
      <div class="postlist__tools">
        <label class="select"><span class="sr">{{排序||Sort}}</span>
          <select data-post-sort><option value="newest" data-zh-label="最新在前" data-en-label="Most recent">最新在前</option><option value="oldest" data-zh-label="最早在前" data-en-label="Oldest first">最早在前</option></select>${iconSvg('chevron-down')}
        </label>
        <label class="field field--search"><span class="sr">{{搜索文章||Search articles}}</span><input type="search" data-post-search placeholder="{{输入关键词||Enter search}}">${iconSvg('search')}</label>
      </div>
    </div>
    <div class="ptable">
      <div class="ptable__cols" aria-hidden="true"><span>{{标题||Title}}</span><span>{{摘要||Description}}</span><span>{{分类||Category}}</span><span>{{日期||Date}}</span></div>
      <ul class="ptable__body">${rows}
      </ul>
      <p class="empty" data-post-empty hidden>{{没有符合条件的文章。||No articles match.}}</p>
    </div>
  </div>`;
}

// ---- gallery of posts (research index, engineering grid) ----
export function postgallery(args, ctx) {
  const list = pick(ctx, args);
  const areas = args.filter === 'areas' ? ctx.site.areas.map((a) => a.key) : null;
  const cards = list.map((p, i) => `
      <li class="gcard" data-post data-groups="${p.category}" data-date="${p.date}" data-order="${i}">
        <a class="gcard__link" href="${p.url}">
          ${meta(ctx, p)}
          <figure class="plate plate--land">${plateFor(p, '4x3')}</figure>
          <h3 class="gcard__title">${tt(ctx, p.title)}</h3>
          <p class="gcard__text">${tt(ctx, p.description)}</p>
        </a>
      </li>`).join('');
  const id = args.id || 'gallery';
  return `
  <div class="postlist" data-postlist data-param="area" id="${id}">
    <div class="postlist__bar">
      <p class="postlist__count"><span data-post-count>${list.length}</span> {{篇文章||articles}}</p>
      <div class="postlist__tools">
        ${areas ? `<div class="seg seg--wrap" role="group" aria-label="{{按方向筛选||Filter by area}}"><button type="button" class="seg__btn" data-filter="all" aria-pressed="true">{{全部||All}}</button>${areas.map((k) => `<button type="button" class="seg__btn" data-filter="${k}" aria-pressed="false">${cat(ctx, k)}</button>`).join('')}</div>` : ''}
        <label class="field field--search"><span class="sr">{{搜索文章||Search articles}}</span><input type="search" data-post-search placeholder="{{输入关键词||Enter search}}">${iconSvg('search')}</label>
      </div>
    </div>
    <ul class="gallery">${cards}
    </ul>
    <p class="empty" data-post-empty hidden>{{这个方向还没有文章。||No articles in this area yet.}}</p>
  </div>`;
}

// ---- small stacked post teasers (news page side columns) ----
export function postteasers(args, ctx) {
  return pick(ctx, args).map((p) => `
    <article class="teaser">
      ${meta(ctx, p)}
      <h3 class="teaser__title"><a href="${p.url}">${tt(ctx, p.title)}</a></h3>
      <p class="teaser__text">${tt(ctx, p.description)}</p>
    </article>`).join('');
}

// ---- lead story (center of the news page) ----
export function postlead(args, ctx) {
  const p = pick(ctx, args)[0];
  if (!p) return '';
  return `
    <article class="leadstory">
      ${meta(ctx, p)}
      <a class="leadstory__plate" href="${p.url}" tabindex="-1" aria-hidden="true"><figure class="plate plate--wide">${plateFor(p, '16x9')}</figure></a>
      <h2 class="leadstory__title"><a href="${p.url}">${tt(ctx, p.title)}</a></h2>
      <p class="leadstory__text">${tt(ctx, p.description)}</p>
    </article>`;
}

// ---- one featured post: text left, plate right ----
export function postfeature(args, ctx) {
  const p = pick(ctx, args)[0];
  if (!p) return '';
  return `
    <article class="feature">
      <div class="feature__body">
        ${meta(ctx, p)}
        <h2 class="feature__title"><a href="${p.url}">${tt(ctx, p.title)}</a></h2>
        <p class="feature__text">${tt(ctx, p.description)}</p>
        <a class="btn btn--soft" href="${p.url}">{{阅读全文||Read more}}</a>
      </div>
      <a class="feature__plate" href="${p.url}" tabindex="-1" aria-hidden="true"><figure class="plate plate--wide">${plateFor(p, '16x9')}</figure></a>
    </article>`;
}

// ---- carousel of featured posts; tone=dark for the research page ----
export function postcarousel(args, ctx) {
  const list = pick(ctx, args);
  const slides = list.map((p) => `
      <article class="fslide" data-slide>
        <div class="fslide__body">
          ${meta(ctx, p)}
          <h3 class="fslide__title"><a href="${p.url}">${tt(ctx, p.title)}</a></h3>
          <p class="fslide__text">${tt(ctx, p.description)}</p>
          <a class="btn ${args.tone === 'dark' ? 'btn--light' : 'btn--soft'}" href="${p.url}">{{阅读全文||Read more}}</a>
        </div>
        <a class="fslide__plate" href="${p.url}" tabindex="-1" aria-hidden="true"><figure class="plate plate--wide">${plateFor(p, '16x9')}</figure></a>
      </article>`).join('');
  return `
  <section class="fcarousel${args.tone === 'dark' ? ' fcarousel--dark' : ''}" data-carousel aria-roledescription="carousel" aria-label="${args.label || '{{精选文章||Featured articles}}'}">
    <div class="fcarousel__stage" aria-live="polite">${slides}
    </div>
    ${pager()}
  </section>`;
}

export function pager() {
  return `<div class="pager">
      <button type="button" class="iconbtn" data-carousel-prev aria-label="{{上一个||Previous}}">${iconSvg('arrow-left')}</button>
      <span class="pager__count" data-carousel-count>01 / 01</span>
      <button type="button" class="iconbtn" data-carousel-next aria-label="{{下一个||Next}}">${iconSvg('arrow-right')}</button>
    </div>`;
}

// ---- related posts at the foot of an article ----
export function related(args, ctx, page) {
  const self = ctx.posts.find((x) => x.url === page.name + '.html');
  let list = ctx.posts.filter((p) => p.url !== page.name + '.html');
  if (self) list = [...list.filter((p) => p.category === self.category), ...list.filter((p) => p.kind === self.kind && p.category !== self.category), ...list.filter((p) => p.kind !== self.kind && p.category !== self.category)];
  list = list.slice(0, Number(args.limit || 3));
  return `
  <section class="related">
    <h2 class="label">{{相关文章||Related articles}}</h2>
    <div class="related__list">${list.map((p) => `
      <article class="teaser">
        ${meta(ctx, p)}
        <h3 class="teaser__title"><a href="${p.url}">${tt(ctx, p.title)}</a></h3>
        <p class="teaser__text">${tt(ctx, p.description)}</p>
      </article>`).join('')}
    </div>
  </section>`;
}

// ---- research areas with post counts ----
export function areas(args, ctx) {
  const skip = args.exclude;
  return `<ul class="areas">${ctx.site.areas.filter((a) => a.key !== skip).map((a) => {
    const n = ctx.posts.filter((p) => p.category === a.key).length;
    return `
    <li class="area"><a class="area__link" href="${a.url}">
      <h3 class="area__title">${cat(ctx, a.key)}</h3>
      <p class="area__count">{{${n} 篇文章||${n} ${n === 1 ? 'article' : 'articles'}}}</p>
      <p class="area__text">${tt(ctx, a.desc)}</p>
    </a></li>`;
  }).join('')}
  </ul>`;
}

// ---- practices: rows (overview page), slides (company carousel), links (lists) ----
export function practices(args, ctx) {
  let list = ctx.site.practices;
  if (args.audience) list = list.filter((p) => p.audience === args.audience);
  if (args.view === 'slides') {
    return list.map((p) => `
      <article class="slide" data-slide>
        <figure class="plate plate--square">${renderPlate({ kind: 'auto', seed: 'practice-' + p.key, ratio: '1x1' })}</figure>
        <div class="slide__body">
          <h3 class="slide__title">${tt(ctx, p.name)}</h3>
          <p class="slide__text">${tt(ctx, p.desc)}</p>
          <a class="link" href="${p.url}">{{了解这条业务线||About this practice}}</a>
        </div>
      </article>`).join('');
  }
  if (args.view === 'links') {
    return `<ul class="linklist">${list.map((p) => `<li><a class="link" href="${p.url}">${tt(ctx, p.name)}</a></li>`).join('')}</ul>`;
  }
  return `<ul class="rows">${list.map((p) => `
    <li><a class="row" href="${p.url}">
      <figure class="plate plate--thumb">${renderPlate({ kind: 'auto', seed: 'practice-' + p.key, ratio: '1x1' })}</figure>
      <span class="row__body"><span class="row__title">${tt(ctx, p.name)}</span><span class="row__text">${tt(ctx, p.desc)}</span></span>
      <span class="row__go" aria-hidden="true">${iconSvg('arrow-right')}</span>
    </a></li>`).join('')}
  </ul>`;
}

// ---- site map page ----
export function sitemap(args, ctx) {
  const order = [['home', '首页', 'Home'], ['news', '新闻', 'News'], ['research', '研究', 'Research'], ['perspectives', '观点', 'Perspectives'], ['commitments', '承诺', 'Commitments'], ['company', '公司', 'Company'], ['practices', '业务', 'Practices'], ['contact', '联系', 'Contact'], ['legal', '条款与政策', 'Terms and policies']];
  return `<div class="sitemap">${order.map(([key, zh, en]) => {
    const list = ctx.pages.filter((p) => (p.meta.section || '') === key && !p.meta.noindex);
    if (!list.length) return '';
    return `
    <section class="sitemap__group">
      <h2 class="h3">{{${zh}||${en}}}</h2>
      <ul class="linklist">${list.map((p) => `<li><a class="link" href="${p.name}.html">${tt(ctx, p.meta.navTitle || p.meta.title)}</a></li>`).join('')}</ul>
    </section>`;
  }).join('')}
  </div>`;
}

// ---- mailto link attributes with a subject in each language: <a class="btn" <!-- @mailto zh="主题" en="Subject" -->>…</a> ----
export function mailto(args, ctx) {
  const url = (s) => `mailto:${ctx.site.email}?subject=${encodeURIComponent(s)}`;
  return `href="${url(args.zh)}" data-zh-href="${url(args.zh)}" data-en-href="${url(args.en)}"`;
}
