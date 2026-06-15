namespace VideoTool.Domain.Entities;

public class Chapter
{
    public int Id { get; set; }
    public int FlowProjectId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string VideoLink { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsLocked { get; set; }
    public bool? ShowDuration { get; set; }
    public string? GateJson { get; set; }

    public FlowProject? FlowProject { get; set; }
}
