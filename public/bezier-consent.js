/*!
 * Bezier One · cookie consent banner v1.0
 *
 * Vanilla JS, no dependencies. Drop-in via <script> tag with data attributes.
 *
 *   <script src="/bezier-consent.js"
 *           data-ga-id="G-XXXXXXXXXX"
 *           data-pixel-id="XXXXXXXXXXXXXXX"
 *           data-policy-url="/legal/politique-cookies.md"
 *           data-locale="en"
 *           defer></script>
 *
 * Footer revoke link (place anywhere in the document) ·
 *   <a href="#" data-bezier-consent-open>Manage cookies</a>
 *
 * Legal · CNIL strict compliance · no third-party script is injected before
 * explicit consent. Reject is as easy and visible as Accept (same level,
 * same row, same prominence). Choice persisted in localStorage for ~13 months.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var GA_ID = (script && script.dataset && script.dataset.gaId) || '';
  var PIXEL_ID = (script && script.dataset && script.dataset.pixelId) || '';
  var POLICY_URL =
    (script && script.dataset && script.dataset.policyUrl) ||
    '/legal/politique-cookies.md';
  var LOCALE = (
    (script && script.dataset && script.dataset.locale) ||
    document.documentElement.lang ||
    'en'
  )
    .toLowerCase()
    .slice(0, 2);

  var STORAGE_KEY = 'bezier.cookies-consent';
  var TTL_MS = 13 * 30 * 24 * 60 * 60 * 1000;
  var VERSION = 'v1';

  var STRINGS = {
    en: {
      title: 'Cookies on Bezier One',
      body:
        "We use essential cookies to run the site. With your consent, we also use analytics (Google Analytics) and marketing (Meta Pixel) cookies to understand traffic and measure ads. You can change your choice anytime from the footer.",
      accept: 'Accept all',
      reject: 'Reject all',
      customize: 'Customize',
      save: 'Save preferences',
      essential: 'Essential',
      essentialDesc: 'Required for the site to work. Always on.',
      analytics: 'Analytics',
      analyticsDesc: 'Google Analytics. Anonymous traffic measurement.',
      marketing: 'Marketing',
      marketingDesc: 'Meta Pixel. Ad performance measurement.',
      policy: 'Cookie policy',
      on: 'On',
      off: 'Off',
    },
    fr: {
      title: 'Cookies sur Bezier One',
      body:
        "Nous utilisons des cookies essentiels pour le fonctionnement du site. Avec votre accord, nous utilisons aussi des cookies de mesure d'audience (Google Analytics) et marketing (Meta Pixel) pour comprendre notre trafic et mesurer nos publicités. Vous pouvez changer d'avis à tout moment depuis le footer.",
      accept: 'Tout accepter',
      reject: 'Tout refuser',
      customize: 'Personnaliser',
      save: 'Enregistrer mes préférences',
      essential: 'Essentiels',
      essentialDesc: 'Nécessaires au fonctionnement. Toujours actifs.',
      analytics: "Mesure d'audience",
      analyticsDesc: "Google Analytics. Mesure anonyme du trafic.",
      marketing: 'Marketing',
      marketingDesc: 'Meta Pixel. Mesure de la performance publicitaire.',
      policy: 'Politique cookies',
      on: 'Activé',
      off: 'Désactivé',
    },
    ja: {
      title: 'Bezier One のクッキー',
      body:
        'サイト運営に必要なクッキーを使用しています。同意いただいた場合、トラフィック分析（Google Analytics）と広告計測（Meta Pixel）のクッキーも使用します。設定はフッターからいつでも変更できます。',
      accept: 'すべて許可',
      reject: 'すべて拒否',
      customize: 'カスタマイズ',
      save: '設定を保存',
      essential: '必須',
      essentialDesc: 'サイト運営に必要です。常時オン。',
      analytics: '分析',
      analyticsDesc: 'Google Analytics による匿名のトラフィック計測。',
      marketing: 'マーケティング',
      marketingDesc: 'Meta Pixel による広告効果計測。',
      policy: 'クッキーポリシー',
      on: 'オン',
      off: 'オフ',
    },
    zh: {
      title: 'Bezier One 的 Cookie',
      body:
        '我们使用必要的 Cookie 来运行网站。在您同意的情况下，我们还使用分析（Google Analytics）和营销（Meta Pixel）Cookie 来了解流量和衡量广告。您可以随时通过页脚更改您的选择。',
      accept: '全部接受',
      reject: '全部拒绝',
      customize: '自定义',
      save: '保存偏好',
      essential: '必要',
      essentialDesc: '网站运行所需。始终开启。',
      analytics: '分析',
      analyticsDesc: 'Google Analytics 匿名流量统计。',
      marketing: '营销',
      marketingDesc: 'Meta Pixel 广告效果衡量。',
      policy: 'Cookie 政策',
      on: '开',
      off: '关',
    },
  };

  var t = STRINGS[LOCALE] || STRINGS.en;

  function readChoice() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data.version !== VERSION) return null;
      if (Date.now() - data.ts > TTL_MS) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeChoice(analytics, marketing) {
    var data = {
      version: VERSION,
      ts: Date.now(),
      analytics: !!analytics,
      marketing: !!marketing,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage unavailable, nothing to do
    }
    return data;
  }

  var gaLoaded = false;
  var pixelLoaded = false;

  function loadGA() {
    if (gaLoaded || !GA_ID) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src =
      'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function loadPixel() {
    if (pixelLoaded || !PIXEL_ID) return;
    pixelLoaded = true;
    /* prettier-ignore */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function applyChoice(c, allowReload) {
    if (!c) return;
    // If the new choice revokes a script already loaded in this session,
    // reload the page to fully unload it. Avoids the "still tracking after
    // revoke" trap when the user changes their mind mid-session.
    if (allowReload && ((gaLoaded && !c.analytics) || (pixelLoaded && !c.marketing))) {
      location.reload();
      return;
    }
    if (c.analytics) loadGA();
    if (c.marketing) loadPixel();
  }

  var STYLE =
    '#bzc-root{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;' +
    'font-family:"Geist","Inter",system-ui,-apple-system,sans-serif;' +
    'color:#f4f4f5;pointer-events:none}' +
    '#bzc-root *{box-sizing:border-box}' +
    '.bzc-card{margin:16px auto;max-width:1180px;background:#0d0d10;' +
    'border:1px solid #1f1f25;border-radius:14px;padding:22px 26px;' +
    'pointer-events:auto;box-shadow:0 24px 60px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.35)}' +
    '@media (max-width:680px){.bzc-card{margin:12px;padding:18px 18px 20px}}' +
    '.bzc-title{font-size:13px;font-weight:600;letter-spacing:.02em;' +
    'text-transform:uppercase;color:#f4f4f5;margin:0 0 8px}' +
    '.bzc-body{font-size:14px;line-height:1.55;color:#a1a1aa;margin:0 0 16px;' +
    'max-width:780px}' +
    '.bzc-body a{color:#f4f4f5;text-decoration:underline;' +
    'text-decoration-thickness:1px;text-underline-offset:2px}' +
    '.bzc-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;' +
    'justify-content:flex-end}' +
    '@media (max-width:680px){.bzc-row{flex-direction:column-reverse;' +
    'align-items:stretch;gap:8px}}' +
    '.bzc-btn{appearance:none;border:1px solid transparent;border-radius:8px;' +
    'padding:11px 18px;font-family:inherit;font-size:14px;font-weight:500;' +
    'cursor:pointer;line-height:1;transition:background .15s ease,' +
    'border-color .15s ease,color .15s ease;letter-spacing:.01em}' +
    '.bzc-btn-link{background:transparent;color:#a1a1aa;border-color:transparent;' +
    'text-decoration:underline;text-decoration-thickness:1px;' +
    'text-underline-offset:3px;padding:11px 12px}' +
    '.bzc-btn-link:hover{color:#f4f4f5}' +
    '.bzc-btn-ghost{background:transparent;color:#f4f4f5;' +
    'border-color:#3a3a42}' +
    '.bzc-btn-ghost:hover{border-color:#f4f4f5}' +
    '.bzc-btn-primary{background:#E84A1F;color:#fff;border-color:#E84A1F}' +
    '.bzc-btn-primary:hover{background:#ff5a2a;border-color:#ff5a2a}' +
    '.bzc-detail{margin:18px 0 4px;display:none;border-top:1px solid #1f1f25;' +
    'padding-top:16px}' +
    '.bzc-detail.bzc-open{display:block}' +
    '.bzc-cat{display:grid;grid-template-columns:1fr auto;gap:6px 16px;' +
    'padding:12px 0;border-bottom:1px solid #16161a;align-items:center}' +
    '.bzc-cat:last-of-type{border-bottom:0}' +
    '.bzc-cat-name{font-size:14px;font-weight:600;color:#f4f4f5;margin:0}' +
    '.bzc-cat-desc{font-size:13px;color:#a1a1aa;margin:0;grid-column:1/-1}' +
    '.bzc-toggle{position:relative;width:42px;height:24px;background:#2a2a30;' +
    'border-radius:14px;cursor:pointer;transition:background .15s ease;' +
    'flex-shrink:0}' +
    '.bzc-toggle.bzc-on{background:#E84A1F}' +
    '.bzc-toggle.bzc-locked{cursor:not-allowed;opacity:.55}' +
    '.bzc-toggle::after{content:"";position:absolute;top:3px;left:3px;' +
    'width:18px;height:18px;background:#fff;border-radius:50%;' +
    'transition:transform .15s ease}' +
    '.bzc-toggle.bzc-on::after{transform:translateX(18px)}' +
    '.bzc-policy{display:inline-block;margin-top:14px;font-size:13px;' +
    'color:#a1a1aa;text-decoration:underline;text-underline-offset:3px}' +
    '.bzc-policy:hover{color:#f4f4f5}';

  function injectStyles() {
    if (document.getElementById('bzc-style')) return;
    var s = document.createElement('style');
    s.id = 'bzc-style';
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  var root = null;
  var state = { analytics: false, marketing: false, detailOpen: false };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0)
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c == null) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  function categoryRow(name, desc, key, locked) {
    var toggle = el('div', {
      class:
        'bzc-toggle' +
        (state[key] || locked ? ' bzc-on' : '') +
        (locked ? ' bzc-locked' : ''),
      role: 'switch',
      tabindex: locked ? '-1' : '0',
      'aria-checked': state[key] || locked ? 'true' : 'false',
      'aria-label': name + ' · ' + (state[key] || locked ? t.on : t.off),
      onClick: function () {
        if (locked) return;
        state[key] = !state[key];
        toggle.classList.toggle('bzc-on');
        toggle.setAttribute('aria-checked', state[key] ? 'true' : 'false');
        toggle.setAttribute('aria-label', name + ' · ' + (state[key] ? t.on : t.off));
      },
      onKeydown: function (e) {
        if (locked) return;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          state[key] = !state[key];
          toggle.classList.toggle('bzc-on');
        }
      },
    });
    return el('div', { class: 'bzc-cat' }, [
      el('p', { class: 'bzc-cat-name' }, [name]),
      toggle,
      el('p', { class: 'bzc-cat-desc' }, [desc]),
    ]);
  }

  function build() {
    var detail = el('div', { class: 'bzc-detail', id: 'bzc-detail' }, [
      categoryRow(t.essential, t.essentialDesc, 'essential', true),
      categoryRow(t.analytics, t.analyticsDesc, 'analytics', false),
      categoryRow(t.marketing, t.marketingDesc, 'marketing', false),
    ]);

    var customizeBtn = el(
      'button',
      {
        type: 'button',
        class: 'bzc-btn bzc-btn-link',
        'aria-expanded': 'false',
        'aria-controls': 'bzc-detail',
        onClick: function () {
          state.detailOpen = !state.detailOpen;
          detail.classList.toggle('bzc-open', state.detailOpen);
          customizeBtn.setAttribute(
            'aria-expanded',
            state.detailOpen ? 'true' : 'false'
          );
          saveBtn.style.display = state.detailOpen ? '' : 'none';
        },
      },
      [t.customize]
    );

    var rejectBtn = el(
      'button',
      {
        type: 'button',
        class: 'bzc-btn bzc-btn-ghost',
        onClick: function () {
          rejectAll();
        },
      },
      [t.reject]
    );

    var acceptBtn = el(
      'button',
      {
        type: 'button',
        class: 'bzc-btn bzc-btn-primary',
        onClick: function () {
          acceptAll();
        },
      },
      [t.accept]
    );

    var saveBtn = el(
      'button',
      {
        type: 'button',
        class: 'bzc-btn bzc-btn-ghost',
        style: 'display:none',
        onClick: function () {
          savePartial(state.analytics, state.marketing);
        },
      },
      [t.save]
    );

    var card = el('div', { class: 'bzc-card', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'bzc-title' }, [
      el('h2', { class: 'bzc-title', id: 'bzc-title' }, [t.title]),
      el('p', { class: 'bzc-body' }, [t.body]),
      detail,
      el('div', { class: 'bzc-row' }, [customizeBtn, saveBtn, rejectBtn, acceptBtn]),
      el(
        'a',
        { class: 'bzc-policy', href: POLICY_URL, target: '_blank', rel: 'noopener' },
        [t.policy + ' →']
      ),
    ]);

    return el('div', { id: 'bzc-root' }, [card]);
  }

  function openBanner() {
    if (root && root.parentNode) return;
    var existing = readChoice();
    state.analytics = !!(existing && existing.analytics);
    state.marketing = !!(existing && existing.marketing);
    state.detailOpen = false;
    root = build();
    document.body.appendChild(root);
  }

  function closeBanner() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  }

  function acceptAll() {
    var c = writeChoice(true, true);
    applyChoice(c, true);
    closeBanner();
  }

  function rejectAll() {
    var c = writeChoice(false, false);
    closeBanner();
    applyChoice(c, true);
  }

  function savePartial(analytics, marketing) {
    var c = writeChoice(analytics, marketing);
    closeBanner();
    applyChoice(c, true);
  }

  window.bezierConsent = {
    open: openBanner,
    accept: acceptAll,
    reject: rejectAll,
    save: savePartial,
    state: readChoice,
  };

  function bindOpeners() {
    var triggers = document.querySelectorAll('[data-bezier-consent-open]');
    for (var i = 0; i < triggers.length; i++) {
      triggers[i].addEventListener('click', function (e) {
        e.preventDefault();
        openBanner();
      });
    }
  }

  function init() {
    injectStyles();
    bindOpeners();
    var existing = readChoice();
    if (existing) applyChoice(existing);
    else openBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
