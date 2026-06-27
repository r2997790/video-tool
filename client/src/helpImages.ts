import eventSetupSvg from './assets/help/event-setup.svg?url'
import flowEditorSvg from './assets/help/flow-editor.svg?url'
import flowsListSvg from './assets/help/flows-list.svg?url'
import liveChatSvg from './assets/help/live-chat.svg?url'
import publicDemoSvg from './assets/help/public-demo.svg?url'
import settingsThemeSvg from './assets/help/settings-theme.svg?url'

export const HELP_IMAGE_URLS = {
  eventSetup: eventSetupSvg,
  flowEditor: flowEditorSvg,
  flowsList: flowsListSvg,
  liveChat: liveChatSvg,
  publicDemo: publicDemoSvg,
  settingsTheme: settingsThemeSvg,
} as const

export type HelpImageKey = keyof typeof HELP_IMAGE_URLS
