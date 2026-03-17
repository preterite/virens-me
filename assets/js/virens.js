/**
 * VIRENS Unified JavaScript
 * Shared across virens.io, verdantinquiry.org, virens.me
 */

/* ===== TAGLINES ===== */
const TAGLINES = [
  "a manifesto for adhocracy",
  "artificially induced precision",
  "binge-viewing the dramatistic pentad",
  "chmod 012 /usr/bin/means_of_production",
  ".config set -o prolix -o pedantic -o obscure",
  "correlation does not imply grant funding",
  "debugging and recalibrating the irony detectors",
  "dialectical materialism as retail therapy",
  "digging through the rubble of the filter bubble",
  "domain parking for arrays of juxtaposed autoantonyms",
  "early warning for transient airborne smugness events",
  "epistemic paralysis for rhetorical analysis",
  "flattening the indifference curve",
  "gleefully feeding the memory hole",
  "glitter in the litterbox",
  "grep -r 'meaning' /dev/null",
  "grep -r false_consciousness /lib/ideology/",
  "hasty radicalizations",
  "holiday in the stacks",
  "it's actually probably not on the syllabus",
  "kryptonite catnip",
  "like github for ongoing derails",
  "ln -f metaphysics/method/teleology abort/retry/fail",
  "marathon of curious synchronicity",
  "mercenary interpellations",
  "nocturnal elisions",
  "ontology does not recapitulate phenomenology",
  "practice precedes condition in terminal aesthetics",
  "recent commits position history over security",
  "sed -i '' 's/method of production/production of method/g'",
  "spacebar liquidation",
  "speleology for your teleology",
  "staggeringly equivocal",
  "standards so high they're practically double",
  "sudo yolo-mode --enable error: auth token expired",
  "systemctl status cat_distribution_system: active",
  "subliminal malapropisms",
  "valde inutilis res est nisi scriptum",
  "veritatem invenire requirit errores nostros scribere",
  "virescit in ruinis eruditionis nostrae spes",
  "you say pleonasmus like it's a bad thing",
];

/**
 * Initialize tagline rotation
 */
function initTaglineRotation() {
  const taglineElement = document.getElementById('tagline-text');
  if (!taglineElement) return;

  const randomTagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
  taglineElement.textContent = randomTagline;
}

/**
 * Mobile navigation toggle
 */
function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const navList = document.querySelector('.nav-list');

  if (!hamburger || !navList) return;

  hamburger.addEventListener('click', () => {
    navList.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', 
      navList.classList.contains('open') ? 'true' : 'false'
    );
  });

  // Close menu when a link is clicked
  document.querySelectorAll('.nav-item a').forEach(link => {
    link.addEventListener('click', () => {
      navList.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navList.contains(e.target)) {
      navList.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navList.classList.contains('open')) {
      navList.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Set active navigation item
 */
function setActiveNavItem() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-item a');

  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (currentPath === linkPath || 
        (currentPath === '/' && linkPath === '/index.html')) {
      link.parentElement.classList.add('active');
    } else {
      link.parentElement.classList.remove('active');
    }
  });
}

/**
 * Highlight current page in breadcrumbs
 */
function highlightBreadcrumbs() {
  const breadcrumbs = document.querySelector('.breadcrumbs-content');
  if (!breadcrumbs) return;
  
  const text = breadcrumbs.textContent;
  const parts = text.split('>').map(part => part.trim());
  
  if (parts.length > 1) {
    const lastItem = parts.pop();
    const path = parts.join(' > ');
    breadcrumbs.innerHTML = `${path} > <span class="breadcrumb-current">${lastItem}</span>`;
  }
}

/**
 * GitHub Activity Widget
 *
 * Fetches recent commits from a public GitHub repo and displays
 * them as a list. The repo is read from a data-repo attribute
 * on the widget element, so each site can specify its own repo
 * via the sidebar template (e.g. data-repo="{{ site.github.repository }}").
 *
 * No-ops if #github-activity doesn't exist on the page (only
 * virens.me's sidebar-index.html includes it currently).
 *
 * JS CONCEPTS: async/await, fetch API, template literals,
 * dataset API, error handling with try/catch.
 */
async function initGitHubWidget() {
  const widget = document.getElementById('github-activity');
  if (!widget) return;

  // Read repo from data attribute; fall back to virens-me.
  const repo = widget.dataset.repo || 'preterite/virens-me';
  const apiUrl = `https://api.github.com/repos/${repo}/commits?per_page=3`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('GitHub API request failed');
    
    const commits = await response.json();
    
    widget.innerHTML = commits.map(commit => `
      <li>
        <div class="github-commit-msg">
          <a href="${commit.html_url}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(commit.commit.message.split('\n')[0])}
          </a>
        </div>
        <div class="github-commit-meta">
          ${new Date(commit.commit.author.date).toLocaleDateString()} · 
          ${commit.commit.author.name}
        </div>
      </li>
    `).join('');
  } catch (error) {
    console.error('GitHub widget error:', error);
    widget.innerHTML = '<li>Unable to load recent commits</li>';
  }
}

/**
 * Code block copy button
 */
function initCodeCopyButtons() {
  document.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
    const button = wrapper.querySelector('.copy-button');
    const code = wrapper.querySelector('pre code');
    
    if (!button || !code) return;
    
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(code.textContent).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      });
    });
  });
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Header compact/squoosh on scroll
 *
 * Toggles `body.header-compact` when the user scrolls past a
 * threshold, triggering the CSS transitions that shrink the
 * header, logotype, and title. The threshold can be set per-page
 * via a `data-squoosh-threshold` attribute on <body>:
 *   - Content pages: low threshold (~60px) so the header
 *     compresses quickly to maximize reading space.
 *   - Index pages: higher threshold (~200-250px) so the full
 *     header stays visible while the lede is in view.
 *
 * Respects `prefers-reduced-motion: reduce` -- CSS handles the
 * instant state change (transition: none !important), but we
 * still toggle the class so layout shifts correctly.
 *
 * JS concepts: scroll event, requestAnimationFrame for
 * debouncing, dataset API, classList toggle, matchMedia.
 */
function initCompactHeader() {
  const threshold = parseInt(document.body.dataset.squooshThreshold, 10) || 60;
  let ticking = false;

  function updateHeader() {
    document.body.classList.toggle('header-compact', window.scrollY > threshold);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  updateHeader();
}

/**
 * TOC auto-build from headings
 *
 * When a page has no `toc:` front matter (and therefore no
 * Liquid-rendered .section-toc), this function builds the TOC
 * dynamically from h2[id] elements inside .reading-column.
 *
 * Must run before initH2TopLinks() — that function injects an
 * <a> into each h2, which would pollute textContent used here
 * as the link label.
 *
 * No-ops when:
 *   - .toc-sticky doesn't exist (no sidebar on this page)
 *   - .section-toc already exists (Liquid rendered it from front matter)
 *   - No h2[id] elements found in .reading-column
 *
 * JS concepts: querySelectorAll, createElement, appendChild,
 * template literals, textContent, prepend.
 */
function initTocFromHeadings() {
  const tocSticky = document.querySelector('.toc-sticky');
  if (!tocSticky) return;

  // Liquid already rendered a TOC from front matter — nothing to do.
  if (tocSticky.querySelector('.section-toc')) return;

  const headings = document.querySelectorAll('.reading-column h2[id]');
  if (headings.length === 0) return;

  // Build the TOC block.
  const section = document.createElement('div');
  section.className = 'section-toc sidebar-section';

  const heading = document.createElement('h3');
  heading.textContent = 'On This Page';
  section.appendChild(heading);

  const ol = document.createElement('ol');
  headings.forEach(h2 => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h2.id;
    // textContent reads the heading text before initH2TopLinks()
    // injects its <a> — call order in DOMContentLoaded ensures this.
    a.textContent = h2.textContent;
    li.appendChild(a);
    ol.appendChild(li);
  });
  section.appendChild(ol);

  // Prepend before the layer strip and other sidebar sections.
  tocSticky.prepend(section);
}

/**
 * TOC active-section tracking
 *
 * Uses IntersectionObserver to watch each <h2> inside
 * .reading-column and highlight the corresponding TOC link
 * when that section is visible.
 *
 * JS concepts: IntersectionObserver, rootMargin, feature
 * detection, querySelectorAll, Map for lookup, classList.
 */
function initTocTracking() {
  const tocContainer = document.querySelector('.section-toc');
  if (!tocContainer) return;

  const tocLinks = new Map();
  tocContainer.querySelectorAll('a[href^="#"]').forEach(link => {
    const id = link.getAttribute('href').slice(1);
    tocLinks.set(id, link);
  });

  if (tocLinks.size === 0) return;

  const headings = [];
  tocLinks.forEach((link, id) => {
    const heading = document.getElementById(id);
    if (heading) headings.push(heading);
  });

  if (headings.length === 0) return;

  let activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    if (activeId && tocLinks.has(activeId)) {
      tocLinks.get(activeId).classList.remove('toc-active');
    }
    if (id && tocLinks.has(id)) {
      tocLinks.get(id).classList.add('toc-active');
    }
    activeId = id;
  }

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    let topmost = null;
    let topmostTop = Infinity;

    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const top = entry.boundingClientRect.top;
        if (top < topmostTop) {
          topmostTop = top;
          topmost = entry.target;
        }
      }
    });

    if (topmost) {
      setActive(topmost.id);
    }
  }, {
    root: null,
    rootMargin: '-164px 0px -60% 0px',
    threshold: 0
  });

  headings.forEach(heading => observer.observe(heading));

  if (window.scrollY < 300 && headings.length > 0) {
    setActive(headings[0].id);
  }
}

/**
 * H2 back-to-top links
 *
 * Injects an <a> element into each .reading-column h2, positioned
 * over the accent mark. Clicking scrolls to #top.
 * The CSS `:has()` selector brightens the accent mark on hover.
 *
 * No-ops on sites without .reading-column h2 elements.
 *
 * JS CONCEPTS: querySelectorAll, forEach, createElement,
 * preventDefault, matchMedia, smooth scrolling.
 */
function initH2TopLinks() {
  const headings = document.querySelectorAll('.reading-column h2');
  if (headings.length === 0) return;

  headings.forEach((h2) => {
    const link = document.createElement('a');
    link.href = '#top';
    link.className = 'h2-top-link';
    link.setAttribute('aria-label', 'Back to top');
    link.setAttribute('tabindex', '0');

    link.addEventListener('click', (e) => {
      e.preventDefault();
      const reducedMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? 'instant' : 'smooth'
      });
    });

    h2.prepend(link);
  });
}

/**
 * Floating back-to-top pill
 *
 * Sentinel: .tagline-box (last element inside .toc-sticky).
 * Pill appears when the tagline exits the BOTTOM of the viewport —
 * meaning the sticky block has run out of travel room and the user
 * is near the page end. Pill disappears when the tagline re-enters
 * the viewport (user scrolled back up).
 *
 * Direction check: entry.boundingClientRect.top > window.innerHeight
 * confirms the element is below the viewport (scrolled past going down),
 * not above it (scrolled past going up). This prevents the pill
 * appearing immediately on load or when the user returns to the top.
 *
 * Aligns horizontally just left of the sidebar edge (into the gutter)
 * via --pill-left CSS custom property set from getBoundingClientRect.
 *
 * JS CONCEPTS: IntersectionObserver, getBoundingClientRect,
 * CSS custom properties from JS, classList toggle.
 */
function initBackToTopPill() {
  const pill = document.querySelector('.back-to-top');
  const sentinel = document.querySelector('.tagline-box');
  const sidebar = document.querySelector('.content-sidebar');
  if (!pill || !sentinel) return;

  pill.addEventListener('click', (e) => {
    e.preventDefault();
    const reducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'instant' : 'smooth'
    });
  });

  function alignPill() {
    if (!sidebar) return;
    const rect = sidebar.getBoundingClientRect();
    pill.style.setProperty('--pill-left', rect.left + 'px');
  }

  alignPill();
  window.addEventListener('resize', alignPill, { passive: true });

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // h1 is visible -- user is still near the top of the page.
          pill.classList.remove('visible');
        } else if (entry.boundingClientRect.bottom < 0) {
          // h1 has scrolled fully above the viewport -- user is in the body.
          pill.classList.add('visible');
        }
      });
    },
    { threshold: 0 }
  );

  observer.observe(sentinel);
}

/**
 * Initialize all functionality on DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initCompactHeader();
  initTocFromHeadings(); // must run before initH2TopLinks() pollutes h2 textContent
  initTocTracking();
  initH2TopLinks();
  initBackToTopPill();
  initTaglineRotation();
  initMobileNav();
  setActiveNavItem();
  highlightBreadcrumbs();
  initGitHubWidget();
  initCodeCopyButtons();
});

/**
 * Update active nav on popstate (browser back/forward)
 */
window.addEventListener('popstate', setActiveNavItem);
