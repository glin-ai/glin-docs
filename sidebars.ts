import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  sdkSidebar: [
    {
      type: 'doc',
      id: 'sdk/intro',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'sdk/getting-started/overview',
        'sdk/getting-started/installation',
        'sdk/getting-started/quickstart',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'sdk/core-concepts/architecture',
        'sdk/core-concepts/authentication',
        'sdk/core-concepts/accounts',
        'sdk/core-concepts/transactions',
        'sdk/core-concepts/events',
      ],
    },
    {
      type: 'category',
      label: 'Contract Interaction',
      items: [
        'sdk/contracts/deploying',
        'sdk/contracts/calling-methods',
        'sdk/contracts/querying-state',
        'sdk/contracts/metadata',
      ],
    },
    {
      type: 'category',
      label: 'TypeScript SDK',
      items: [
        'sdk/typescript/setup',
        'sdk/typescript/browser-extensions',
        'sdk/typescript/react-integration',
        'sdk/typescript/api-reference',
        'sdk/typescript/examples',
      ],
    },
    {
      type: 'category',
      label: 'Rust SDK',
      items: [
        'sdk/rust/setup',
        'sdk/rust/cli-tools',
        'sdk/rust/async-patterns',
        'sdk/rust/api-reference',
        'sdk/rust/examples',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'sdk/examples/sign-in-with-glin',
        'sdk/examples/deploy-contract',
        'sdk/examples/build-indexer',
        'sdk/examples/create-cli-tool',
      ],
    },
  ],

  blockchainSidebar: [
    {
      type: 'doc',
      id: 'blockchain/intro',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Running a Node',
      items: [
        'blockchain/node/installation',
        'blockchain/node/configuration',
        'blockchain/node/development',
      ],
    },
    {
      type: 'category',
      label: 'Validators',
      items: [
        'blockchain/validators/setup',
        'blockchain/validators/keys',
        'blockchain/validators/staking',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'blockchain/architecture/overview',
        'blockchain/architecture/pallets',
        'blockchain/architecture/runtime',
      ],
    },
  ],
};

export default sidebars;
