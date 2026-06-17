namespace VideoTool.Domain.Entities;

public class EventAttendee
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string Status { get; set; } = "pending"; // pending, approved, rejected
    public string Source { get; set; } = "manual"; // app_form, webhook, csv, crm, manual
    public string? RejectedReason { get; set; }
    public string? AnswersJson { get; set; }
    public string? ConsentRegion { get; set; }
    public DateTime? ConsentGivenAt { get; set; }
    public string? ConsentNoticeVersion { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
