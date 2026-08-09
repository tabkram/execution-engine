import { defineConfig } from 'vitepress';

const REPO = 'https://github.com/tabkram/execution-engine';

export default defineConfig({
  title: 'Execution Engine',
  description: 'A TypeScript library for tracing and visualizing code execution workflows.',
  lang: 'en-US',

  // Published at https://tabkram.github.io/execution-engine/
  base: '/execution-engine/',
  cleanUrls: true,
  lastUpdated: true,

  vite: {
    css: {
      preprocessorOptions: { scss: { api: 'modern' } }
    }
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/execution-engine/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#6d5ce7' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Execution Engine' }],
    ['meta', { property: 'og:description', content: 'Trace, cache and visualize TypeScript code execution as a graph.' }],
    ['meta', { property: 'og:url', content: 'https://tabkram.github.io/execution-engine/' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/what-is-execution-engine', activeMatch: '/guide/' },
      { text: 'Execution', link: '/execution/trace', activeMatch: '/execution/' },
      { text: 'Engine', link: '/engine/trace', activeMatch: '/engine/' },
      { text: 'Examples', link: `${REPO}/tree/main/examples` },
      {
        text: 'v4',
        items: [
          { text: 'Changelog', link: `${REPO}/blob/main/CHANGELOG.md` },
          { text: 'Migration', link: '/reference/migration' },
          { text: 'npm package', link: 'https://www.npmjs.com/package/execution-engine' },
          { text: 'Contributing', link: `${REPO}/blob/main/CONTRIBUTING.md` }
        ]
      }
    ],

    sidebar: [
      {
        text: 'Introduction',
        collapsed: false,
        items: [
          { text: 'What is Execution Engine?', link: '/guide/what-is-execution-engine' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Which API to use', link: '/guide/which-api-to-use' }
        ]
      },
      {
        // Part 1 — src/execution: one function at a time, no engine.
        text: 'Execution',
        collapsed: false,
        items: [
          { text: 'Trace', link: '/execution/trace' },
          { text: 'Cache', link: '/execution/cache' },
          { text: 'Memoize', link: '/execution/memoize' },
          { text: 'Timer', link: '/execution/timer' }
        ]
      },
      {
        // Part 2 — src/engine: calls become nodes, the engine infers the edges.
        text: 'Engine',
        collapsed: false,
        items: [
          { text: 'Trace', link: '/engine/trace' },
          { text: 'TraceableEngine', link: '/engine/traceable-engine' },
          { text: 'ExecutionEngine', link: '/engine/execution-engine' },
          { text: '@engine and @run', link: '/engine/engine-run' }
        ]
      },
      {
        text: 'Reference',
        collapsed: false,
        items: [
          { text: 'Types', link: '/reference/types' },
          { text: 'Migration', link: '/reference/migration' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: REPO },
      { icon: 'npm', link: 'https://www.npmjs.com/package/execution-engine' }
    ],

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: `${REPO}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub'
    },

    outline: {
      level: [2, 3],
      label: 'On this page'
    },

    footer: {
      message: '<strong>Released under the MIT License.</strong>',
      copyright: `<strong>Copyright © 2023-${new Date().getFullYear()} Akram TABKA</strong>`
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: false
  },

  sitemap: {
    hostname: 'https://tabkram.github.io/execution-engine/'
  }
});
