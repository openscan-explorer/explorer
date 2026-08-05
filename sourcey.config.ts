// Sourcey input manifest for OpenScan's agent-facing documentation index.
// The generated llms.txt is published by scripts/generate-llms.mjs.
export default {
  name: "OpenScan",
  repo: "https://github.com/openscan-explorer/explorer",
  navigation: {
    tabs: [
      {
        tab: "Overview",
        slug: "",
        groups: [
          {
            group: "Start here",
            pages: [".claude/CLAUDE"],
          },
        ],
      },
      {
        tab: "Project",
        slug: "project",
        groups: [
          {
            group: "Project guides",
            pages: ["README", "CONTRIBUTING"],
          },
        ],
      },
      {
        tab: "Development",
        slug: "development",
        groups: [
          {
            group: "Engineering guides",
            pages: [
              ".claude/rules/architecture",
              ".claude/rules/testing",
              ".claude/rules/workflow",
              ".claude/rules/code-style",
            ],
          },
        ],
      },
    ],
  },
};
