import { HELP_IMAGE_URLS } from './helpImages'

export type HelpLink = {
  label: string
  to: string
}

export type HelpScreenshot = {
  src: string
  alt: string
  caption: string
}

export type HelpSection = {
  id: string
  title: string
  intro: string
  steps?: string[]
  bullets?: string[]
  links?: HelpLink[]
  screenshot?: HelpScreenshot
  tip?: string
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    intro:
      'Demo Studio lets you build interactive video demos and run live broadcast events. This guide walks you through the admin panel from first login to publishing a public demo.',
    steps: [
      'Sign in at the admin login page using your username and password.',
      'If this is your first login, you will be asked to change your password before continuing.',
      'Open Flow Design to create your first demo flow, or Event Management if you already have a flow and want to schedule a live session.',
      'Configure global behaviour and branding under Settings before sharing demos publicly.',
    ],
    links: [
      { label: 'Login', to: '/admin/login' },
      { label: 'Flow Design', to: '/admin/flows' },
      { label: 'Settings', to: '/admin/settings' },
    ],
    screenshot: {
      src: HELP_IMAGE_URLS.flowsList,
      alt: 'Flow Design list showing demo projects with enable toggles and action buttons',
      caption: 'The Flow Design page lists all your demo projects. Use the toggle to publish or unpublish each flow.',
    },
  },
  {
    id: 'flow-design',
    title: 'Flow Design overview',
    intro:
      'A flow is a complete demo experience — video chapters, questions, branching paths, and in-video pop-ups. Each flow has its own public URL that viewers can open at any time.',
    steps: [
      'Go to Flow Design and click New flow to create a project, or pick a template from the library.',
      'Give your flow a name and URL slug. The slug becomes part of the public link (for example, /flow/product-tour).',
      'Open the flow to edit it in the visual flow editor.',
      'Use Live Preview to test the demo exactly as viewers will see it.',
      'When you are happy with the result, return to the flow list and turn on the enable toggle to make it public.',
    ],
    links: [
      { label: 'Flow Design', to: '/admin/flows' },
      { label: 'Settings — Behaviour', to: '/admin/settings?tab=behavior' },
    ],
    bullets: [
      'Disabled flows are hidden from public URLs but remain editable in admin.',
      'Duplicate an existing flow to use it as a starting point for a new demo.',
      'Copy the public share link from the flow list to send to prospects or embed in emails.',
    ],
    screenshot: {
      src: HELP_IMAGE_URLS.flowEditor,
      alt: 'Visual flow editor canvas with connected chapter and question nodes',
      caption: 'The flow editor shows your demo as a connected canvas. Click any node to edit its settings in the panel on the right.',
    },
  },
  {
    id: 'building-a-flow',
    title: 'Building a demo flow',
    intro:
      'The flow editor is where you design the viewer journey. Drag nodes from the palette, connect them, and configure each step in the property panel.',
    steps: [
      'Add a Chapter node and link it to a video (YouTube, a live stream URL, or a direct MP4 file).',
      'Insert Question nodes to collect answers — use Branch nodes afterward to route viewers down different paths.',
      'Add Toaster nodes for timed pop-ups (banners, download prompts, or clickable graphics) during playback.',
      'Add Pause Point nodes to stop the video and ask the viewer something before continuing.',
      'Configure Chat scripts on the Chat scripts tab to pre-populate the chat panel with starter messages.',
      'Open Live Preview and walk through the entire flow before publishing.',
    ],
    bullets: [
      'Chapter nodes pull video content from the shared chapters library — edit video links directly on the node or in the Chapters admin table.',
      'Branch nodes match a previous answer to a specific path or external URL.',
      'Event nodes can show a countdown to a scheduled broadcast or link to an existing event.',
      'Use the intro screen settings on the flow to set the heading and subtext viewers see before playback starts.',
    ],
    links: [
      { label: 'Flow Design', to: '/admin/flows' },
    ],
    tip: 'Save your work frequently. The editor auto-saves most changes, but complex edits are easier to undo if you save before major restructuring.',
  },
  {
    id: 'event-management',
    title: 'Event Management',
    intro:
      'Events are scheduled broadcast sessions. Viewers land on a lobby page with a countdown, then enter the linked demo flow when the event goes live.',
    steps: [
      'Go to Event Management and click New event.',
      'On the Settings tab, set the title, URL slug, and choose which flow plays when the event goes live.',
      'Configure the holding screen — heading, message, image, and optional waiting-room video.',
      'On the Schedule tab, choose one-time, interval, or weekly recurrence and set start times.',
      'On the Access tab, control who can register (open, invite-only, or domain-restricted).',
      'On the Attendees tab, review registrations and export the list.',
      'Enable the event when you are ready for the public lobby URL to work.',
    ],
    links: [
      { label: 'Event Management', to: '/admin/events' },
      { label: 'Settings — Events', to: '/admin/settings?tab=events' },
    ],
    bullets: [
      'Each event needs a flow — create and enable a flow first if the dropdown is empty.',
      'The lobby page is at /event/your-slug. Share this link for registrations and countdown.',
      'Set a live duration so the event automatically ends after the broadcast window.',
    ],
    screenshot: {
      src: HELP_IMAGE_URLS.eventSetup,
      alt: 'Event settings form with title, slug, flow selector, and holding screen fields',
      caption: 'Event Settings lets you link a flow, configure the waiting-room screen, and set the public slug.',
    },
  },
  {
    id: 'live-event',
    title: 'During a live event',
    intro:
      'When an event is live, use the monitoring tabs to engage with viewers and track results in real time.',
    steps: [
      'Open the event in Event Management and switch to the Live chat tab to reply to viewer messages.',
      'Check the Leads tab to see form submissions and contact details captured during the session.',
      'Review the Insights tab for engagement metrics — viewer counts, chapter watch time, and interaction data.',
      'Use Settings → Integrations to mirror chat to Slack or Microsoft Teams if your team monitors those channels.',
    ],
    links: [
      { label: 'Event Management', to: '/admin/events' },
      { label: 'Settings — Integrations', to: '/admin/settings?tab=integrations' },
    ],
    bullets: [
      'Live chat replies appear instantly in the viewer\'s chat panel.',
      'If AI chat is enabled in Settings, the system can reply automatically when you are not available.',
      'Lead webhooks fire a JSON payload to your CRM whenever a new lead is captured.',
    ],
    screenshot: {
      src: HELP_IMAGE_URLS.liveChat,
      alt: 'Live chat panel showing viewer messages and admin reply field',
      caption: 'The Live chat tab shows incoming viewer messages. Type a reply and send it directly to the active session.',
    },
  },
  {
    id: 'settings',
    title: 'Settings',
    intro:
      'Settings control global defaults for every demo and event. Changes here apply to all public viewer experiences unless overridden at the flow or chapter level.',
    steps: [
      'Behaviour — toggle autoplay, chat, AI replies, live chat, seed chat, chapter picking, and pause controls.',
      'Theme — upload your logo, set brand name, colours, fonts, and chat panel title. Preview changes live on the right.',
      'Leads — configure webhook URLs and email notifications for new lead submissions.',
      'Events — set registration webhooks and blocked email domains for event sign-ups.',
      'Integrations — connect Slack and Microsoft Teams to mirror demo chat in both directions.',
    ],
    links: [
      { label: 'Settings — Behaviour', to: '/admin/settings?tab=behavior' },
      { label: 'Settings — Theme', to: '/admin/settings?tab=theme' },
      { label: 'Settings — Leads', to: '/admin/settings?tab=leads' },
      { label: 'Settings — Events', to: '/admin/settings?tab=events' },
      { label: 'Settings — Integrations', to: '/admin/settings?tab=integrations' },
    ],
    screenshot: {
      src: HELP_IMAGE_URLS.settingsTheme,
      alt: 'Theme settings with colour pickers and a live preview of the demo viewer',
      caption: 'The Theme tab lets you match demos to your brand. The preview panel shows how viewers will see your changes.',
    },
  },
  {
    id: 'publishing',
    title: 'Publishing and sharing',
    intro:
      'Once a flow or event is enabled, it becomes available at a public URL. Share these links in emails, on your website, or in calendar invites.',
    steps: [
      'Enable the flow toggle on the Flow Design list page (or the event toggle on Event Management).',
      'Copy the public URL — flows use /flow/your-slug and events use /event/your-slug.',
      'Test the link in a private browser window to confirm the viewer experience looks correct.',
      'For events, share the lobby URL before the start time so attendees can register and see the countdown.',
    ],
    bullets: [
      'Disabled flows and events return a "not found" page for public visitors.',
      'The home page at / automatically lists all enabled flows and upcoming events.',
      'Use Live Preview in the flow editor to test without enabling the flow publicly.',
    ],
    links: [
      { label: 'Flow Design', to: '/admin/flows' },
      { label: 'Event Management', to: '/admin/events' },
    ],
    screenshot: {
      src: HELP_IMAGE_URLS.publicDemo,
      alt: 'Public demo viewer with chapter sidebar, video player, and chat panel',
      caption: 'The public demo viewer shows chapters on the left, video in the centre, and chat on the right.',
    },
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    intro:
      'If something is not working as expected, check these common causes before reaching out for support.',
    bullets: [
      'Demo not visible on the home page — make sure the flow is enabled (toggle on) in Flow Design.',
      'Chat not appearing — check Settings → Behaviour and confirm Chat is turned on.',
      'AI not replying — enable AI in Settings and ensure OPENAI_API_KEY is set on the server.',
      'Event not going live — verify the schedule, timezone, and that the linked flow is enabled.',
      'Slack or Teams not syncing — confirm integration toggles are on and the required environment variables are configured on the server.',
      'Video not playing — check the video URL on the chapter node. YouTube IDs, full YouTube URLs, and direct MP4 links are all supported.',
      'Viewers cannot pause — the Pause toggle in Settings must be enabled for pause points to work.',
    ],
    links: [
      { label: 'Settings — Behaviour', to: '/admin/settings?tab=behavior' },
      { label: 'Settings — Integrations', to: '/admin/settings?tab=integrations' },
      { label: 'Flow Design', to: '/admin/flows' },
      { label: 'Event Management', to: '/admin/events' },
    ],
    tip: 'Use Live Preview in the flow editor to reproduce viewer issues without affecting the public demo.',
  },
]
