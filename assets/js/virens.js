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
 * Initialize GIF rotation
 * Note: Assumes GIFs are in /assets/img/sidebar/ directory
 */
function initGifRotation() {
  const gifElement = document.getElementById('sidebar-gif');
  if (!gifElement) return;

  // GIF count is set via data attribute in HTML
  const gifCount = parseInt(gifElement.dataset.gifCount) || 60;
  const randomNum = Math.floor(Math.random() * gifCount) + 1;
  const paddedNum = String(randomNum).padStart(3, '0');
  
  // Set the source - Jekyll will handle the correct path
  gifElement.src = `/assets/img/sidebar/abstract${paddedNum}.gif`;
  gifElement.alt = 'Decorative abstract gradient';
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
        (currentPath === '/' && linkPath === '/index.html') ||
        (currentPath.endsWith('/') && linkPath === '/')) {
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
 * Fetches recent commits from public SRE repo
 */
async function initGitHubWidget() {
  const widget = document.getElementById('github-activity');
  if (!widget) return;

  const repo = 'preterite/SRE'; // Public SRE repo
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
 * Contact form protection
 */
function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  const timestampField = document.getElementById('timestamp');
  
  if (!contactForm || !timestampField) return;
  
  // Set initial timestamp
  timestampField.value = Date.now();
  
  // Validate submission timing
  contactForm.addEventListener('submit', function(e) {
    const submitTime = Date.now();
    const formOpenTime = parseInt(timestampField.value);
    
    // Block if filled too quickly (< 3 seconds = likely bot)
    if (submitTime - formOpenTime < 3000) {
      e.preventDefault();
      alert('Please take a moment to complete the form.');
      return false;
    }
    
    // Check honeypot field
    const honeypot = document.querySelector('input[name="website_url"]');
    if (honeypot && honeypot.value !== '') {
      e.preventDefault();
      return false;
    }
  });
}

/**
 * Email reveal (progressive disclosure for spam protection)
 */
function revealEmails() {
  const button = event.target;
  const contactMethods = button.parentElement.querySelector('.contact-methods');
  
  if (!contactMethods) return;
  
  const siteType = document.body.dataset.site; // Set via Jekyll
  
  let emailHtml = '';
  
  if (siteType === 'virens-io') {
    emailHtml = `
      <p><strong>Technical Support:</strong><br>
      <a href="mailto:support@virens.io">support@virens.io</a></p>
      
      <p><strong>General Inquiries:</strong><br>
      <a href="mailto:info@virens.io">info@virens.io</a></p>
    `;
  } else if (siteType === 'verdantinquiry') {
    emailHtml = `
      <p><strong>Academic Inquiries:</strong><br>
      <a href="mailto:inquiry@verdantinquiry.org">inquiry@verdantinquiry.org</a></p>
      
      <p><strong>Method Questions:</strong><br>
      <a href="mailto:method@verdantinquiry.org">method@verdantinquiry.org</a></p>
    `;
  } else if (siteType === 'virens-me') {
    emailHtml = `
      <p><strong>Development Questions:</strong><br>
      <a href="mailto:dev@virens.me">dev@virens.me</a></p>
      
      <p><strong>Blog Inquiries:</strong><br>
      <a href="mailto:blog@virens.me">blog@virens.me</a></p>
    `;
  }
  
  contactMethods.innerHTML = emailHtml;
  button.style.display = 'none';
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
 *   - Index pages: higher threshold (~200–250px) so the full
 *     header stays visible while the lede is in view.
 *
 * Respects `prefers-reduced-motion: reduce` — CSS handles the
 * instant state change (transition: none !important), but we
 * still toggle the class so layout shifts correctly.
 *
 * JS concepts: scroll event, requestAnimationFrame for
 * debouncing, dataset API, classList toggle, matchMedia.
 */
function initCompactHeader() {
  // Read threshold from data attribute; default 60px.
  // Index mockup sets data-squoosh-threshold="200";
  // content pages use the default or a lower value.
  const threshold = parseInt(document.body.dataset.squooshThreshold, 10) || 60;

  // Track whether we've already requested an animation frame,
  // so we don't queue redundant work on fast scroll.
  let ticking = false;

  /**
   * The actual check: compare scrollY to threshold and
   * add or remove the compact class. classList.toggle's
   * second argument (force) adds if true, removes if false —
   * no conditional branch needed.
   */
  function updateHeader() {
    document.body.classList.toggle('header-compact', window.scrollY > threshold);
    ticking = false;
  }

  // Listen for scroll. requestAnimationFrame ensures we only
  // run updateHeader once per frame, even if scroll fires
  // dozens of times between paints.
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true }); // passive: true tells the browser we
                         // won't call preventDefault(), so it
                         // can optimize scroll performance.

  // Run once on load in case the page is already scrolled
  // (e.g., browser restores scroll position on refresh).
  updateHeader();
}

/**
 * TOC active-section tracking
 *
 * Uses IntersectionObserver to watch each <h2> inside
 * .reading-column and highlight the corresponding TOC link
 * when that section is visible. This is more performant than
 * scroll-based measurement because the browser does the
 * geometry checks natively and only fires the callback when
 * elements actually cross the threshold.
 *
 * How IntersectionObserver works:
 *   You create an observer with a callback and options. The
 *   callback fires whenever an observed element enters or
 *   leaves the "root" viewport (here, the browser window).
 *   Each entry in the callback has:
 *     - entry.target: the DOM element being watched
 *     - entry.isIntersecting: true if the element is visible
 *     - entry.intersectionRatio: how much of it is visible
 *
 * rootMargin shifts the detection zone. A negative top margin
 * means "don't count it as visible until it clears the fixed
 * header + nav." This prevents a heading hidden behind the
 * fixed chrome from being marked active.
 *
 * JS concepts: IntersectionObserver, rootMargin, feature
 * detection, querySelectorAll, Map for lookup, classList.
 */
function initTocTracking() {
  const tocContainer = document.querySelector('.section-toc');
  if (!tocContainer) return;

  // Collect all TOC links into a Map keyed by their target ID.
  // Map is like an object but preserves insertion order and
  // has a cleaner API for lookup (tocLinks.get(id)).
  const tocLinks = new Map();
  tocContainer.querySelectorAll('a[href^="#"]').forEach(link => {
    // link.getAttribute('href') returns "#section-viriditas";
    // .slice(1) strips the "#" → "section-viriditas".
    const id = link.getAttribute('href').slice(1);
    tocLinks.set(id, link);
  });

  if (tocLinks.size === 0) return;

  // Collect the observed headings. We query by ID from the
  // TOC links rather than by tag name, so the TOC drives
  // what gets tracked (the HTML is the source of truth).
  const headings = [];
  tocLinks.forEach((link, id) => {
    const heading = document.getElementById(id);
    if (heading) headings.push(heading);
  });

  if (headings.length === 0) return;

  // Track which heading is currently active so we can
  // remove the class before adding it to the new one.
  let activeId = null;

  /**
   * Set a TOC link as active, clearing the previous one.
   * @param {string|null} id - The heading ID, or null to clear all.
   */
  function setActive(id) {
    if (id === activeId) return; // no-op if already active

    // Clear previous
    if (activeId && tocLinks.has(activeId)) {
      tocLinks.get(activeId).classList.remove('toc-active');
    }

    // Set new
    if (id && tocLinks.has(id)) {
      tocLinks.get(id).classList.add('toc-active');
    }

    activeId = id;
  }

  // Feature detection: bail gracefully if the browser
  // doesn't support IntersectionObserver (IE11, very old
  // mobile browsers). The TOC still works — it just won't
  // highlight on scroll.
  if (!('IntersectionObserver' in window)) return;

  // rootMargin: The top margin is negative, pushing the
  // detection zone down by the height of the fixed header
  // (compact: 72px) + nav (~48px) + breathing (24px) = 144px.
  // We add a bit extra (20px) so the heading is clearly
  // visible before it activates. The bottom margin is -60%
  // so that a heading in the lower portion of the viewport
  // doesn't prematurely activate — you want to highlight the
  // section you're *reading*, not the one you're approaching.
  const observer = new IntersectionObserver((entries) => {
    // entries is an array of IntersectionObserverEntry objects.
    // Multiple headings can fire in the same callback if the
    // user scrolls fast.
    //
    // Strategy: find the topmost heading that is currently
    // intersecting. "Topmost" = smallest boundingClientRect.top,
    // which is the heading closest to the top of the viewport.
    // This handles the case where two headings are both visible
    // (short sections) — we want the one the reader just reached.
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
    // null root = browser viewport
    root: null,
    // Top: clear the fixed chrome. Bottom: ignore lower 60%.
    rootMargin: '-164px 0px -60% 0px',
    // threshold: 0 means "fire as soon as any pixel crosses"
    // the adjusted viewport boundary.
    threshold: 0
  });

  // Observe each heading
  headings.forEach(heading => observer.observe(heading));

  // Activate the first section by default if the page
  // loads scrolled to the top (before any heading enters
  // the observer zone).
  if (window.scrollY < 300 && headings.length > 0) {
    setActive(headings[0].id);
  }
}

/**
 * H2 back-to-top links (virens.me)
 *
 * Injects an <a> element into each .reading-column h2, positioned
 * over the three-verticals accent mark. Clicking scrolls to #top.
 * The CSS `:has()` selector in _back-to-top.scss brightens the
 * accent mark on hover — no JS needed for the visual effect.
 *
 * This function no-ops on sites without .reading-column h2 elements
 * (virens.io uses .section-toc instead; verdantinquiry.org TBD).
 *
 * JS CONCEPTS:
 * - querySelectorAll returns a static NodeList (array-like).
 * - forEach iterates it. We create an <a> for each h2 and
 *   prepend it as the first child.
 * - Event.preventDefault() stops the browser's default anchor-jump
 *   so we can use smooth scrolling instead.
 * - matchMedia checks the user's reduced-motion preference.
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

    // Smooth scroll, with instant fallback for reduced-motion.
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const reducedMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? 'instant' : 'smooth'
      });
    });

    // prepend puts the anchor as first child of the h2.
    // It's absolutely positioned, so it doesn't affect text layout.
    h2.prepend(link);
  });
}

/**
 * Floating back-to-top pill (virens.me content pages)
 *
 * A small fixed-position pill that fades in when the tagline box
 * scrolls out of the viewport. Uses IntersectionObserver for
 * visibility toggling and aligns horizontally with the sidebar.
 *
 * Only activates on pages that have both a .back-to-top element
 * and a .tagline-box element — typically content/post pages with
 * a sidebar. No-ops on index, about, and listing pages.
 *
 * JS CONCEPTS:
 * - IntersectionObserver fires a callback when the observed element
 *   enters or exits the viewport. entry.isIntersecting tells us
 *   which direction. We also check entry.boundingClientRect.bottom
 *   to distinguish "scrolled past" (negative = above viewport)
 *   from "not yet scrolled to" (positive = below viewport).
 * - getBoundingClientRect() returns an element's position relative
 *   to the viewport. We read the sidebar's left edge and pass it
 *   to the pill via a CSS custom property (--pill-left).
 * - classList.toggle with a boolean second argument adds (true)
 *   or removes (false) the class unconditionally.
 */
function initBackToTopPill() {
  const pill = document.querySelector('.back-to-top');
  const tagline = document.querySelector('.tagline-box');
  const sidebar = document.querySelector('.content-sidebar');
  if (!pill || !tagline) return;

  // Smooth scroll on click, with reduced-motion fallback.
  pill.addEventListener('click', (e) => {
    e.preventDefault();
    const reducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'instant' : 'smooth'
    });
  });

  // Align pill's left edge with the sidebar's left edge.
  // Using a CSS custom property lets CSS handle the positioning
  // while JS just supplies the value. Recalculate on resize since
  // the centered max-width container shifts with viewport changes.
  function alignPill() {
    if (!sidebar) return;
    const rect = sidebar.getBoundingClientRect();
    pill.style.setProperty('--pill-left', rect.left + 'px');
  }

  alignPill();
  window.addEventListener('resize', alignPill, { passive: true });

  // Feature detection: bail if IntersectionObserver isn't available.
  if (!('IntersectionObserver' in window)) return;

  // Show pill ONLY when tagline has scrolled UP past the top of
  // the viewport — not when it's below (initial page load or
  // short scroll where sidebar hasn't been reached yet).
  //
  // IntersectionObserver fires immediately when observe() is called.
  // At that point the tagline may be below the viewport
  // (!isIntersecting), which would incorrectly show the pill.
  // The fix: check entry.boundingClientRect.bottom — if negative,
  // the element is above the viewport (scrolled past). If positive,
  // it's below (not scrolled to yet).
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Tagline visible — hide pill
          pill.classList.remove('visible');
        } else if (entry.boundingClientRect.bottom < 0) {
          // Tagline above viewport (scrolled past) — show pill
          pill.classList.add('visible');
        }
        // Tagline below viewport (not scrolled to) — do nothing,
        // pill stays hidden.
      });
    },
    { threshold: 0 }
  );

  observer.observe(tagline);
}

/**
 * Initialize all functionality on DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initCompactHeader();
  initTocTracking();
  initH2TopLinks();
  initBackToTopPill();
  initTaglineRotation();
  initGifRotation();
  initMobileNav();
  setActiveNavItem();
  highlightBreadcrumbs();
  initGitHubWidget();
  initContactForm();
  initCodeCopyButtons();
});

/**
 * Update active nav on popstate (browser back/forward)
 */
window.addEventListener('popstate', setActiveNavItem);

/**
 * Make revealEmails available globally for onclick
 */
window.revealEmails = revealEmails;
