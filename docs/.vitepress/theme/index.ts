import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';

import './tokens.scss';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'home-hero-info-before': () =>
        h('p', { class: 'ee-hero-kicker' }, 'TypeScript library · zero dependencies'),
      'home-hero-info-after': () => [
        h(
          'p',
          { class: 'ee-hero-support' },
          'Captured without touching the functions themselves.'
        ),
        h('code', { class: 'ee-hero-install' }, '$ npm i execution-engine')
      ]
    })
} satisfies Theme;
