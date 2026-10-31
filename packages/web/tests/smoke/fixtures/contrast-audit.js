// Browser-side WCAG contrast audit, evaluated as a string by ui.spec.ts (the test
// TypeScript has no DOM lib): `(<this file>)('<root selector>')`.
// Returns every visible text run inside the root that is below AA:
// 4.5:1 for normal text, 3:1 for large text (>= 24px, or >= 18.66px bold).
// Backgrounds are composited from the element up to <html>; gradients count with
// their worst color stop. Disabled controls and hidden/aria-hidden text are exempt.
(rootSelector) => {
  const parse = (value) => {
    let m = /^rgba?\(([^)]+)\)/.exec(value);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    m = /^color\(srgb ([^)]+)\)/.exec(value);
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
      return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1];
    }
    return null;
  };
  const stops = (image) =>
    (image.match(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g) || []).map(parse).filter(Boolean);
  const over = (top, base) => {
    const a = top[3];
    return [top[0] * a + base[0] * (1 - a), top[1] * a + base[1] * (1 - a), top[2] * a + base[2] * (1 - a)];
  };
  const lum = ([r, g, b]) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // Candidate backgrounds behind `el` (several if a gradient is involved).
  const backgrounds = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      const isPage = n === document.body || n === document.documentElement;
      const gradient = !isPage && s.backgroundImage.includes('gradient') ? stops(s.backgroundImage) : [];
      const color = parse(s.backgroundColor);
      if (gradient.length) {
        layers.push(gradient);
        if (gradient.every((c) => c[3] >= 1)) break;
      }
      if (color && color[3] > 0) {
        layers.push([color]);
        if (color[3] >= 1) break;
      }
    }
    let result = [[255, 255, 255]];
    for (let i = layers.length - 1; i >= 0; i--) {
      result = layers[i].flatMap((top) => result.map((base) => over(top, base)));
    }
    return result;
  };

  const opacityOf = (el) => {
    let o = 1;
    for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
    return o;
  };

  const failures = [];
  const seen = new Set();
  const root = document.querySelector(rootSelector) || document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    const el = node.parentElement;
    if (!text || !el) continue;
    if (el.closest('[aria-hidden="true"], svg, script, style, noscript, button:disabled, [aria-disabled="true"], fieldset:disabled, option')) continue;
    const s = getComputedStyle(el);
    if (s.visibility !== 'visible' || s.display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) continue;
    const opacity = opacityOf(el);
    if (opacity === 0) continue;

    const fg = parse(s.color);
    if (!fg) continue;
    const size = parseFloat(s.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(s.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    const worst = Math.min(
      ...backgrounds(el).map((bg) => ratio(over([fg[0], fg[1], fg[2], fg[3] * opacity], bg), bg))
    );
    if (worst + 0.005 < need) {
      const key = `${el.className}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      failures.push(`${Math.round(worst * 100) / 100}:1 < ${need} "${text.slice(0, 40)}" <${el.tagName.toLowerCase()} class="${el.className}">`);
    }
  }
  return failures;
}
