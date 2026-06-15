namespace VideoTool.Domain.Entities;

public class SeedChatMessage
{
    public int Id { get; set; }
    public int FlowProjectId { get; set; }
    public string Role { get; set; } = "assistant";
    public string Text { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public FlowProject? FlowProject { get; set; }
}
