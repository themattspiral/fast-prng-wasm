module.exports = {
  branches: ['main', 'gh-actions'],
  dryRun: true,
  plugins: [
    '@semantic-release/commit-analyzer',
    [
      '@semantic-release/release-notes-generator',
      {
        'preset': 'conventionalcommits',
        'presetConfig': {
          'types': [
            { 'type': 'feat', 'section': '✨ Features' },
            { 'type': 'fix', 'section': '🐛 Bug Fixes' },
            { 'type': 'perf', 'section': '⚡ Performance' },
            { 'type': 'docs', 'section': '📝 Documentation', 'hidden': false },
            { 'type': 'style', 'hidden': true },
            { 'type': 'refactor', 'hidden': true },
            { 'type': 'test', 'hidden': true },
            { 'type': 'build', 'hidden': true },
            { 'type': 'ci', 'hidden': true },
            { 'type': 'chore', 'hidden': true }
          ]
        },
        'writerOpts': {
          'commitGroupsSort': (a, b) => {
            const order = ['✨ Features', '🐛 Bug Fixes', '⚡ Performance', '📝 Documentation'];
            const aIndex = order.indexOf(a.title);
            const bIndex = order.indexOf(b.title);
            // if not in order array, put at end
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          },
          'commitsSort': ['scope', 'subject']
        }
      }
    ],
    ['@semantic-release/npm', { 'npmPublish': false, 'tarballDir': '.' }],
    ['@semantic-release/github', { 'assets': ['*.tgz'] }]
  ]
};
