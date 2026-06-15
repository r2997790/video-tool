namespace VideoTool.Domain.Entities;

public class VideoToaster
{
    public int Id { get; set; }
    public int FlowProjectId { get; set; }
    public int? ChapterId { get; set; }
    public int TriggerAtSeconds { get; set; }
    public int DurationSeconds { get; set; } = 5;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string ToasterType { get; set; } = "popup";
    public string? ImageUrl { get; set; }
    public string? LinkUrl { get; set; }
    public bool LinkNewWindow { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? DownloadUrl { get; set; }
    public string? DownloadFileName { get; set; }
    public string BannerPosition { get; set; } = "top";
    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; }

    public FlowProject? FlowProject { get; set; }
}
