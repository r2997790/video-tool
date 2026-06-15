namespace VideoTool.Domain.Entities;

public class FlowProject
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string ProjectName { get; set; } = "Demo Flow";
    public string ProjectDataJson { get; set; } = "{}";
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
