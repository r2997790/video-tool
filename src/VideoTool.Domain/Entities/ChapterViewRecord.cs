namespace VideoTool.Domain.Entities;

public class ChapterViewRecord
{
    public int Id { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public int ChapterId { get; set; }
    public int SecondsWatched { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
