namespace VideoTool.Domain.Entities;

public class ScheduledEvent
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime StartsAtUtc { get; set; }
    public string? HoldingHeading { get; set; }
    public string? HoldingMessage { get; set; }
    public string? HoldingImageUrl { get; set; }
    public string? HoldingVideoUrl { get; set; }
    public string HoldingVideoType { get; set; } = "none";
    public int? DefaultChapterId { get; set; }
    public string? FlowSlug { get; set; }
    public string RecurrenceType { get; set; } = "none";
    public int? IntervalMinutes { get; set; }
    public DateTime? RecurrenceStartUtc { get; set; }
    public DateTime? RecurrenceEndUtc { get; set; }
    public string Timezone { get; set; } = "UTC";
    public string? WeeklyScheduleJson { get; set; }
    public int? LiveDurationMinutes { get; set; }
    public bool IsEnabled { get; set; } = true;
    public string EventKind { get; set; } = "scheduled"; // scheduled, instant, on_demand
    public string AccessMode { get; set; } = "open"; // open, selective
    public string? RegistrationFormJson { get; set; }
    public string RegistrationApprovalMode { get; set; } = "auto"; // auto, manual, crm_or_form
    public string? CrmListKey { get; set; }
    public string? AttendeeWebhookSecret { get; set; }
    public string? PrivacyPolicyOverrideJson { get; set; }
    public string? AccessOverrideJson { get; set; }
    public int? DuplicatedFromId { get; set; }
    public DateTime? OnDemandLiveStartUtc { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
