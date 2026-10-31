import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import path from 'path';

// Exercise the deployment's security headers when testing the production build.
const deployment = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../../vercel.json'), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const previewHeaders = Object.fromEntries(
  deployment.headers.find(entry => entry.source === '/(.*)')!.headers.map(({ key, value }) => [key, value])
);

/**
 * Build-only minification of CSS custom property names: the descriptive design
 * tokens (`--color-primary-soft`, `--font-size-sm`, ...) are a quarter of the
 * stylesheet. Renames every property in the CSS bundle to a short name, most
 * used first. Names that also occur in the JS chunks or in index.html (e.g. set
 * or read from script) keep their name, so behavior is unchanged. Dev builds
 * keep the readable names.
 */
function shortCssCustomProperties(): Plugin {
  const property = /(?<![\w-])--[A-Za-z_][\w-]*/g;
  return {
    name: 'teilfair:short-css-custom-properties',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.values(bundle);
      const text = (file: (typeof files)[number]) =>
        file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : new TextDecoder().decode(file.source);
      const cssFiles = files.filter((file) => file.type === 'asset' && file.fileName.endsWith('.css'));
      const outside = [
        readFileSync(path.resolve(import.meta.dirname, 'index.html'), 'utf8'),
        ...files.filter((file) => !cssFiles.includes(file)).map(text),
      ].join('\n');

      const weight = new Map<string, number>();
      for (const file of cssFiles) {
        for (const [name] of text(file).matchAll(property)) weight.set(name, (weight.get(name) ?? 0) + name.length);
      }
      const renames = new Map<string, string>();
      let index = 0;
      const nextName = () => {
        for (;;) {
          let n = index++;
          let name = '';
          do {
            name = String.fromCharCode(97 + (n % 26)) + name;
            n = Math.floor(n / 26) - 1;
          } while (n >= 0);
          const candidate = `--${name}`;
          if (!weight.has(candidate) && !outside.includes(candidate)) return candidate;
        }
      };
      for (const [name] of [...weight].sort((a, b) => b[1] - a[1])) {
        if (!outside.includes(name)) renames.set(name, nextName());
      }
      for (const file of cssFiles) {
        if (file.type === 'asset') file.source = text(file).replace(property, (name) => renames.get(name) ?? name);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), shortCssCustomProperties()],
  preview: { headers: previewHeaders },
  server: {
    host: "127.0.0.1",
    port: 3000,
  },
  resolve: {
    alias: {
      "@teilfair/shared": path.resolve(import.meta.dirname, "../shared/src"),
    },
  },
  optimizeDeps: {
    include: ["@teilfair/shared"],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{
            debugName: 'vendor-packages',
            name(id: string) {
              if (!id.includes("node_modules")) return undefined;
              if (/react|react-dom|react-router-dom/.test(id)) return "react";
              if (id.includes("@supabase")) return "supabase";
              if (/i18next|react-i18next/.test(id)) return "i18n";
              if (id.includes("@fortawesome")) return "fontawesome";
              return "vendor";
            },
          }],
        },
      },
    },
  },
});
