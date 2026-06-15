namespace VideoTool.Domain.Entities;

public class VideoPausePoint
{
    public int Id { get; set; }
    public int FlowProjectId { get; set; }
    public int? ChapterId { get; set; }
    public int TriggerAtSeconds { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string FieldId { get; set; } = "answer";
    public string InputType { get; set; } = "text";
    public string? OptionsJson { get; set; }
    public bool Required { get; set; } = true;
    public string? Placeholder { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; }

    public FlowProject? FlowProject { get; set; }
}
