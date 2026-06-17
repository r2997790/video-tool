namespace VideoTool.Domain.Entities;

public class EventSessionLink
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string EventSlug { get; set; } = string.Empty;
    public DateTime? EventOccurrenceStartUtc { get; set; }
    public int? RegisteredAttendeeId { get; set; }
    public string? ViewerEmail { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
