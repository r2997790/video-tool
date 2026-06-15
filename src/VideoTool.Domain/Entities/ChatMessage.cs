namespace VideoTool.Domain.Entities;

public class ChatMessage
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string? FlowSlug { get; set; }
    public string Role { get; set; } = "user";
    public string Text { get; set; } = string.Empty;
    public string Source { get; set; } = "demo";
    public string? ExternalId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
