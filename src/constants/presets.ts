import { ServicePreset } from "../types/app";

export const SERVICE_PRESETS: ServicePreset[] = [
  {
    key: "whatsapp",
    name: "WhatsApp",
    url: "https://web.whatsapp.com",
    domain: "whatsapp.com",
    accent: "#25D366",
  },
  {
    key: "messenger",
    name: "Messenger",
    url: "https://www.messenger.com",
    domain: "messenger.com",
    accent: "#0084FF",
  },
  {
    key: "telegram",
    name: "Telegram",
    url: "https://web.telegram.org/a/",
    domain: "telegram.org",
    accent: "#26A5E4",
  },
  {
    key: "discord",
    name: "Discord",
    url: "https://discord.com/app",
    domain: "discord.com",
    accent: "#5865F2",
  },
  {
    key: "slack",
    name: "Slack",
    url: "https://app.slack.com/client",
    domain: "slack.com",
    accent: "#E01E5A",
  },
  {
    key: "gmail",
    name: "Gmail",
    url: "https://mail.google.com",
    domain: "mail.google.com",
    accent: "#EA4335",
  },
  {
    key: "notion",
    name: "Notion",
    url: "https://www.notion.so",
    domain: "notion.so",
    accent: "#FFFFFF",
  },
  {
    key: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com",
    domain: "chatgpt.com",
    accent: "#10A37F",
  },
  {
    key: "teams",
    name: "Teams",
    url: "https://teams.microsoft.com",
    domain: "teams.microsoft.com",
    accent: "#6264A7",
  },
  {
    key: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com",
    domain: "instagram.com",
    accent: "#E4405F",
  },
  {
    key: "zoom",
    name: "Zoom",
    url: "https://app.zoom.us/wc",
    domain: "zoom.us",
    accent: "#2D8CFF",
  },
  {
    key: "gcalendar",
    name: "Google Calendar",
    url: "https://calendar.google.com",
    domain: "calendar.google.com",
    accent: "#4285F4",
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    url: "https://www.linkedin.com",
    domain: "linkedin.com",
    accent: "#0A66C2",
  },
  {
    key: "gmessages",
    name: "Google Messages",
    url: "https://messages.google.com/web",
    domain: "messages.google.com",
    accent: "#1A73E8",
  },
  {
    key: "element",
    name: "Element",
    url: "https://app.element.io",
    domain: "element.io",
    accent: "#0DBD8B",
  },
  {
    key: "rocketchat",
    name: "Rocket.Chat",
    url: "https://open.rocket.chat",
    domain: "rocket.chat",
    accent: "#F5455C",
  },
  {
    key: "mattermost",
    name: "Mattermost",
    url: "https://community.mattermost.com",
    domain: "mattermost.com",
    accent: "#0058CC",
  },
  {
    key: "zulip",
    name: "Zulip",
    url: "https://zulip.com",
    domain: "zulip.com",
    accent: "#6492FE",
  },
  {
    key: "guilded",
    name: "Guilded",
    url: "https://www.guilded.gg",
    domain: "guilded.gg",
    accent: "#F5C400",
  },
  {
    key: "wechat",
    name: "WeChat",
    url: "https://wx.qq.com",
    domain: "wx.qq.com",
    accent: "#07C160",
  },
  {
    key: "gmeet",
    name: "Google Meet",
    url: "https://meet.google.com",
    domain: "meet.google.com",
    accent: "#00897B",
  },
  {
    key: "webex",
    name: "Webex",
    url: "https://web.webex.com",
    domain: "webex.com",
    accent: "#00BCF2",
  },
  {
    key: "outlook",
    name: "Outlook",
    url: "https://outlook.live.com",
    domain: "outlook.live.com",
    accent: "#0078D4",
  },
  {
    key: "protonmail",
    name: "Proton Mail",
    url: "https://mail.proton.me",
    domain: "proton.me",
    accent: "#6D4AFF",
  },
  {
    key: "yahoomail",
    name: "Yahoo Mail",
    url: "https://mail.yahoo.com",
    domain: "mail.yahoo.com",
    accent: "#6001D2",
  },
  {
    key: "tutamail",
    name: "Tuta Mail",
    url: "https://app.tuta.com",
    domain: "tuta.com",
    accent: "#840010",
  },
  {
    key: "fastmail",
    name: "Fastmail",
    url: "https://app.fastmail.com",
    domain: "fastmail.com",
    accent: "#1B6AC9",
  },
  {
    key: "xmessages",
    name: "X Messages",
    url: "https://x.com/messages",
    domain: "x.com",
    accent: "#FFFFFF",
  },
  {
    key: "redditchat",
    name: "Reddit Chat",
    url: "https://www.reddit.com/chat",
    domain: "reddit.com",
    accent: "#FF4500",
  },
  {
    key: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com",
    domain: "facebook.com",
    accent: "#1877F2",
  },
  {
    key: "twitch",
    name: "Twitch",
    url: "https://www.twitch.tv",
    domain: "twitch.tv",
    accent: "#9146FF",
  },
];

export function faviconUrlFor(urlOrDomain: string): string {
  try {
    const domain = urlOrDomain.includes("://")
      ? new URL(urlOrDomain).hostname
      : urlOrDomain;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  } catch {
    return "";
  }
}
