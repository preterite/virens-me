# virens.me

Development blog for [VIRENS](https://virens.io) — updates, tutorials, and technical insights for humanities computing.

## What This Site Is

virens.me narrates the ongoing development of the VIRENS research workflow system. It covers build progress, technical decisions, tutorials, and reflections on humanities computing. It's the "what's happening" companion to [verdantinquiry.org](https://verdantinquiry.org)'s philosophy and [virens.io](https://virens.io)'s documentation.

## Local Development

```bash
cd ~/Sites/virens-sites/virens.me
bundle exec jekyll serve
# → http://localhost:4000
```

Requires Ruby and Bundler. Run `bundle install` on first setup.

## Content Structure

```
index.html            Blog stream (paginated, 10 per page)
about.md              About + colophon
archive.html          Full post archive
categories.html       Category index
contact.md            Contact information
_posts/               Blog posts (YYYY-MM-DD-title.md)
```

**Permalink style:** `/:year/:month/:title/` (blog-style dated URLs)

**Layouts:** `default.html` (pages), `post.html` (blog posts)

## Writing Posts

Create a new file in `_posts/` following the naming convention:

```
_posts/YYYY-MM-DD-descriptive-title.md
```

Default frontmatter (applied automatically):

```yaml
layout: post
show_metadata: true
```

## CSS Architecture

virens.me is the only site using SCSS compilation. The theme is built from partials:

```
_sass/virens-me/
  _about.scss
  _back-to-top.scss
  _pills.scss
  _sidebar.scss
  _stream.scss
  _theme-core.scss
```

Manifest at `assets/css/virens-me-theme.scss` imports the partials. Jekyll's built-in Sass pipeline compiles on build.

## Shared Infrastructure

This site shares visual infrastructure with [verdantinquiry.org](https://github.com/preterite/verdant-inquiry) and [virens.io](https://github.com/preterite/virens-io):

- **Base CSS:** `assets/css/virens-base.css` (shared across all three sites, manually propagated)
- **Theme:** `virens-dark-theme.css` (base) + SCSS partials (extensions)
- **Fonts:** Cooper Hewitt (headings), Libre Baskerville (body), JetBrains Mono (code) — self-hosted woff2 in `assets/fonts/`
- **Includes:** Shared `header.html`, `footer.html`, `navigation.html`, `sidebar.html`, `breadcrumbs.html`

Cross-links to the other two sites appear in the navigation under "crosslinks."

For full infrastructure documentation, see the [VIRENS Websites Architecture Reference](https://github.com/preterite/virens-me) (maintained in the VIRENS development vault).

## Known Issues

- `github.repository` in `_config.yml` points to `preterite/SRE` — needs updating to `preterite/virens-me`
- Hosting not yet configured (GitHub Pages target)
- `_mockup*.html` files and `.bak` files are development artifacts, not content
- Only one post exists (2024-11-15 welcome) — the blog is pre-launch

## Related Sites

- [verdantinquiry.org](https://verdantinquiry.org) — Philosophy and methodology
- [virens.io](https://virens.io) — Technical documentation and framework downloads

## License

- **Code:** MIT License
- **Content:** CC BY-NC-SA 4.0
