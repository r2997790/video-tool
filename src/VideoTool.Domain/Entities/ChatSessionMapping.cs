namespace VideoTool.Domain.Entities;

public class ChatSessionMapping
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string? SlackChannelId { get; set; }
    public string? SlackThreadTs { get; set; }
    public string? TeamsConversationId { get; set; }
    public string? TeamsServiceUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
