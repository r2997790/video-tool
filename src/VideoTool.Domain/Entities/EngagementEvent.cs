namespace VideoTool.Domain.Entities;

public class EngagementEvent
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string? FlowSlug { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int? ChapterId { get; set; }
    public int? ToasterId { get; set; }
    public string? DataJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
