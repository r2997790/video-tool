namespace VideoTool.Domain.Entities;

public class EventOccurrenceLog
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public DateTime OccurrenceStartUtc { get; set; }
    public DateTime? OccurrenceEndUtc { get; set; }
    public string TriggerSource { get; set; } = "scheduled"; // scheduled, instant, on_demand
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
