import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import starlight from "@astrojs/starlight";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

const useLocalPreviewAdapter = process.env.ASTRO_LOCAL_PREVIEW === "1";

export default defineConfig({
  adapter: useLocalPreviewAdapter ? node({ mode: "standalone" }) : vercel(),
  integrations: [
    starlight({
      title: "Chiron Docs",
      description: "Public docs for methodology-first agentic delivery.",
      logo: {
        src: "./src/assets/chiron-icon.svg",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/FahadAlothman-fsd/chiron-desk",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/FahadAlothman-fsd/chiron-desk/edit/main/apps/docs/",
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
      lastUpdated: true,
      pagination: true,
      favicon: "/chiron-icon.svg",
      customCss: ["./src/styles/starlight-custom.css"],
      sidebar: [
        {
          label: "Orientation",
          items: [{ label: "Home", link: "/" }, "getting-started", "mental-model"],
        },
        {
          label: "Taskflow Runtime",
          items: [
            { label: "Taskflow Overview", slug: "taskflow" },
            { label: "Setup And Onboarding", slug: "taskflow/setup-onboarding" },
            { label: "Brainstorming", slug: "taskflow/brainstorming" },
            { label: "Research", slug: "taskflow/research" },
            { label: "Product Brief", slug: "taskflow/product-brief" },
            { label: "PRD", slug: "taskflow/prd" },
            { label: "Implementation", slug: "taskflow/implementation" },
          ],
        },
        {
          label: "Methodology",
          items: [
            { label: "Default Seeded Methodology", slug: "methodology" },
            { label: "Augmented BMAD Overview", slug: "methodology/augmented-bmad-overview" },
            { label: "Methodology Structure", slug: "methodology/structure" },
            { label: "Project Facts And Durable Context", slug: "methodology/project-facts" },
            {
              label: "Work Units",
              collapsed: true,
              items: [
                { label: "Overview", slug: "methodology/work-units" },
                { label: "Setup", slug: "methodology/work-units/setup" },
                { label: "Brainstorming", slug: "methodology/work-units/brainstorming" },
                { label: "Research", slug: "methodology/work-units/research" },
                { label: "Product Brief", slug: "methodology/work-units/product-brief" },
                { label: "PRD", slug: "methodology/work-units/prd" },
                { label: "Implementation", slug: "methodology/work-units/implementation" },
              ],
            },
          ],
        },
        {
          label: "Design Time",
          items: [
            { label: "Design Time Overview", slug: "design-time" },
            { label: "Methodology Layer", slug: "design-time/methodology-layer" },
            {
              label: "Workflow Layer",
              collapsed: true,
              items: [
                { label: "Overview", slug: "design-time/workflow-layer" },
                { label: "Context Facts", slug: "design-time/workflow-layer/context-facts" },
              ],
            },
            {
              label: "Step Layer",
              collapsed: true,
              items: [
                { label: "Overview", slug: "design-time/step-layer" },
                { label: "Form", slug: "design-time/step-layer/form" },
                { label: "Agent", slug: "design-time/step-layer/agent" },
                { label: "Action", slug: "design-time/step-layer/action" },
                { label: "Invoke", slug: "design-time/step-layer/invoke" },
                { label: "Branch", slug: "design-time/step-layer/branch" },
              ],
            },
            {
              label: "Work Unit Layer",
              collapsed: true,
              items: [
                { label: "Overview", slug: "design-time/work-unit-layer" },
                { label: "Facts", slug: "design-time/work-unit-layer/facts" },
                { label: "Artifact Slots", slug: "design-time/work-unit-layer/artifact-slots" },
                { label: "Workflows", slug: "design-time/work-unit-layer/workflows" },
                {
                  label: "Transitions and State Machine",
                  slug: "design-time/work-unit-layer/transitions-and-state-machine",
                },
              ],
            },
          ],
        },
        {
          label: "Project Runtime",
          items: [
            { label: "Project Runtime Overview", slug: "project-runtime" },
            { label: "Project Overview", slug: "project-runtime/project-overview" },
            { label: "Project Facts", slug: "project-runtime/project-facts" },
            { label: "Work Unit Instances", slug: "project-runtime/work-unit-instances" },
            { label: "Work Unit Instance Detail", slug: "project-runtime/work-unit-instance" },
            { label: "Transition Executions", slug: "project-runtime/transition-executions" },
            { label: "Workflow Executions", slug: "project-runtime/workflow-executions" },
            { label: "Step Executions", slug: "project-runtime/step-executions" },
            { label: "Artifact Slots", slug: "project-runtime/artifact-slots" },
            { label: "Runtime Guidance", slug: "project-runtime/runtime-guidance" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Glossary", slug: "reference/glossary" },
            { label: "Claim Policy", slug: "reference/claim-policy" },
            { label: "Legacy Layer Bridge", slug: "reference/legacy-layer-bridge" },
            { label: "Taskflow Consistency Check", slug: "reference/taskflow-consistency-check" },
          ],
        },
      ],
    }),
  ],
  output: "static",
  devToolbar: {
    enabled: false,
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
  trailingSlash: "ignore",
  vite: {
    plugins: [tailwindcss()],
  },
});
