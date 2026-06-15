namespace VideoTool.Domain.Entities;

public class ChapterVideo
{
    public int Id { get; set; }
    public int ChapterId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string VideoLink { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public Chapter? Chapter { get; set; }
}
