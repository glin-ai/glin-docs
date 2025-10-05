import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'GLIN Documentation',
  tagline: 'Build on GLIN Network - Decentralized AI Training Platform',
  favicon: 'img/glin-coin.svg',

  future: {
    v4: true,
  },

  url: 'https://docs.glin.ai',
  baseUrl: '/',

  organizationName: 'glin-ai',
  projectName: 'glin-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/', // Remove /docs/ prefix since domain is already docs.glin.ai
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/glin-ai/glin-docs/tree/main/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false, // Disable blog for now
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/glin-coin.svg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'GLIN Docs',
      logo: {
        alt: 'GLIN Logo',
        src: 'img/glin-coin.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'networkSidebar',
          position: 'left',
          label: 'Network',
        },
        {
          type: 'docSidebar',
          sidebarId: 'sdkSidebar',
          position: 'left',
          label: 'SDK',
        },
        {
          type: 'docSidebar',
          sidebarId: 'federatedLearningSidebar',
          position: 'left',
          label: 'Federated Learning',
        },
        {
          type: 'docSidebar',
          sidebarId: 'toolsSidebar',
          position: 'left',
          label: 'Tools',
        },
        {
          type: 'docSidebar',
          sidebarId: 'blockchainSidebar',
          position: 'left',
          label: 'Blockchain',
        },
        {
          href: 'https://glin.ai',
          label: 'Website',
          position: 'right',
        },
        {
          href: 'https://github.com/glin-ai',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'SDK Overview',
              to: '/sdk/intro',
            },
            {
              label: 'TypeScript SDK',
              to: '/sdk/typescript/setup',
            },
            {
              label: 'Rust SDK',
              to: '/sdk/rust/setup',
            },
          ],
        },
        {
          title: 'Developers',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/glin-ai',
            },
            {
              label: 'NPM Package',
              href: 'https://www.npmjs.com/package/@glin-ai/sdk',
            },
            {
              label: 'Crates.io',
              href: 'https://crates.io/crates/glin-client',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/glin-ai',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/glin_ai',
            },
            {
              label: 'Telegram',
              href: 'https://t.me/glin_ai',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Website',
              href: 'https://glin.ai',
            },
            {
              label: 'Explorer',
              href: 'https://explorer.glin.ai',
            },
            {
              label: 'Testnet',
              href: 'https://testnet.glin.ai',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} GLIN AI. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['rust', 'toml', 'bash', 'json'],
    },
    algolia: {
      // Will be configured later when we set up Algolia DocSearch
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'glin',
      contextualSearch: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
