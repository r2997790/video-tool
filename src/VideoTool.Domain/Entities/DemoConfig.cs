namespace VideoTool.Domain.Entities;

public class DemoConfig
{
    public int Id { get; set; } = 1;
    public bool Autoplay { get; set; }
    public bool ShowDuration { get; set; } = true;
    public bool ChatEnabled { get; set; } = true;
    public bool AiEnabled { get; set; } = true;
    public bool NotificationsEnabled { get; set; }
    public bool LiveChatEnabled { get; set; }
    public bool SeedChatEnabled { get; set; }
    public bool ChapterPickEnabled { get; set; } = true;
    public bool PauseEnabled { get; set; } = true;
    public string AiSystemPrompt { get; set; } = string.Empty;
    public string ThemePrimaryColor { get; set; } = "#77c043";
    public string ThemeAccentColor { get; set; } = "#4f8a28";
    public string ThemeBackgroundColor { get; set; } = "#0f1011";
    public string ThemeSurfaceColor { get; set; } = "#1a1b1d";
    public string ThemeTextColor { get; set; } = "#e8e8e8";
    public string ThemeFontFamily { get; set; } = "Poppins";
    public string ThemeBrandName { get; set; } = "Empauer";
    public string ThemeChatTitle { get; set; } = "Ask Empauer";
    public string? ThemeLogoUrl { get; set; }
    public bool SlackEnabled { get; set; }
    public string? SlackChannelId { get; set; }
    public bool TeamsEnabled { get; set; }
    public string? TeamsServiceUrl { get; set; }
    public string? LeadWebhookUrl { get; set; }
    public string? LeadNotifyEmail { get; set; }
    public string? DemoChatSubtitle { get; set; }
    public string? AttendeeWebhookUrl { get; set; }
    public string? BlockedEmailDomainsJson { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
