import {readFileSync} from 'node:fs';
import {parse} from 'postcss';
import plugin from 'tailwindcss/plugin.js';
import type {Config} from 'tailwindcss';

function extractRootVars(css: string) {
  const root = parse(css);
  const vars = new Set<string>();
  root.walkRules((rule) => {
    if (rule.selector !== ':root') return;
    rule.each((node) => {
      if (node.type === 'decl' && node.value && node.prop.startsWith('--')) {
        vars.add(node.prop.substring(2));
      }
    });
  });
  return Array.from(vars);
}

const vars = extractRootVars([
  readFileSync(new URL('web_src/css/themes/theme-gitea-light.css', import.meta.url), 'utf8'),
  readFileSync(new URL('web_src/css/themes/theme-gitea-dark.css', import.meta.url), 'utf8'),
].join('\n'));

export default {
  prefix: 'tw-',
  important: true, // the frameworks are mixed together, so tailwind needs to override other framework's styles
  content: [
    '!**/*_test.go',
    './{build,models,modules,routers,services}/**/*.go',
    './templates/**/*.tmpl',
    './web_src/js/**/*.{ts,js,vue}',
  ].filter(Boolean as unknown as <T>(x: T | boolean) => x is T),
  blocklist: [
    // classes that don't work without CSS variables from "@tailwind base" which we don't use
    'transform', 'shadow', 'ring', 'blur', 'grayscale', 'invert', '!invert', 'filter', '!filter',
    'backdrop-filter',
    // we use double-class tw-hidden defined in web_src/css/helpers.css for increased specificity
    'hidden',
    // unneeded classes
    '[-a-zA-Z:0-9_.]',
  ],
  theme: {
    colors: {
      // make `tw-bg-red` etc work with our CSS variables
      ...Object.fromEntries(vars.filter((prop) => prop.startsWith('color-')).map((prop) => {
        const color = prop.substring(6);
        return [color, `var(--color-${color})`];
      })),
      inherit: 'inherit',
      current: 'currentcolor',
      transparent: 'transparent',
    },
    borderRadius: {
      'none': '0',
      'sm': 'var(--border-radius-small)',
      'DEFAULT': 'var(--border-radius)',
      'md': 'var(--border-radius)',
      'lg': 'var(--border-radius-medium)',
      'xl': 'var(--border-radius-medium)',
      '2xl': 'var(--border-radius-large)',
      '3xl': 'var(--border-radius-large)',
      'full': 'var(--border-radius-full)',
    },
    fontFamily: {
      sans: 'var(--fonts-regular)',
      mono: 'var(--fonts-monospace)',
    },
    fontWeight: {
      normal: 'var(--font-weight-normal)',
      medium: 'var(--font-weight-medium)',
      semibold: 'var(--font-weight-semibold)',
    },
    fontSize: { // rarely used, but "text-base" (matching body's 1em=14px) is useful to reset font-size in a header container
      'xs': 'var(--font-size-xs)',
      'sm': 'var(--font-size-sm)',
      'base': 'var(--font-size-md)',
      'lg': 'var(--font-size-lg)',
      'xl': 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
      '3xl': 'var(--font-size-3xl)',
    },
    extend: {
      zIndex: {'1': '1'},
    },
  },
  plugins: [
    plugin(({addUtilities}) => {
      addUtilities({
        // tw-hidden must win all other "display: xxx !important" classes to get the chance to "hide" an element.
        // do not use:
        // * "[hidden]" attribute: it's too weak, can not be applied to an element with "display: flex"
        // * ".hidden" class: it has been polluted by Fomantic UI in many cases
        // * inline style="display: none": it's difficult to tweak
        // * jQuery's show/hide/toggle: it can not show/hide elements with "display: xxx !important"
        // only use:
        // * this ".tw-hidden" class
        // * showElem/hideElem/toggleElem functions in "utils/dom.js"
        '.hidden.hidden': {
          'display': 'none',
        },
        // proposed class from https://github.com/tailwindlabs/tailwindcss/pull/12128
        '.break-anywhere': {
          'overflow-wrap': 'anywhere',
        },
      });
    }),
  ],
} satisfies Config;
