namespace VideoTool.Domain.Entities;

public class LeadSubmission
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string FlowSlug { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public int? ChapterId { get; set; }
    public string? NodeId { get; set; }
    public string AnswersJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
