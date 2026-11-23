export type ThemeMode = "dark" | "oled" | "light";

export interface Workspace {
  id: string;
  name: string;
}

export interface QuietHoursConfig {
  enabled: boolean;
  startTime: string; // "18:30"
  endTime: string; // "09:00"
  weekends: boolean;
}

export interface ServiceConfig {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  iconUrl: string | null;
  order: number;
  neverSleep?: boolean;
  quietHours?: QuietHoursConfig;
}

export interface AppSettings {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  hibernationTimeoutMinutes: number;
  hibernateOnWorkspaceSwitch: boolean;
  focusMode: boolean;
  pinHash: string | null;
  autoLockMinutes?: number;
  launchOnStartup?: boolean;
  startMinimized?: boolean;
  splitRatio?: number;
  privacyShieldOnBlur?: boolean;
  linkSafetyGuard?: boolean;
  askBeforeExternalLink?: boolean;
  globalHotkeyEnabled?: boolean;
  showEcosystemPicks?: boolean;
}

export interface LinkSafetyPrompt {
  url: string;
  host: string;
  serviceId?: string;
  reasons: string[];
}

export interface DownloadItem {
  id: string;
  serviceId: string;
  fileName: string;
  filePath: string;
  receivedBytes: number;
  totalBytes: number;
  state: "inProgress" | "completed" | "interrupted";
}

export interface NoteItem {
  id: string;
  content: string;
  pinned: boolean;
  isTodo: boolean;
  done: boolean;
  createdAt: number;
  category?: string;
}

export interface ServiceUsageStat {
  todaySeconds: number;
  totalSeconds: number;
  lastDate: string;
}

export interface SessionDiskUsage {
  serviceId: string;
  totalBytes: number;
  cacheBytes: number;
}

export interface AppConfig {
  workspaces: Workspace[];
  services: ServiceConfig[];
  activeWorkspaceId: string;
  activeServiceId: string | null;
  settings: AppSettings;
  notes?: NoteItem[];
  noteCategories?: string[];
  usageStats?: Record<string, ServiceUsageStat>;
}

export interface ServicePreset {
  key: string;
  name: string;
  url: string;
  domain: string;
  accent: string;
}
