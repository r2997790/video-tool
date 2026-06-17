namespace VideoTool.Domain.Entities;

public class GlobalAccessListEntry
{
    public int Id { get; set; }
    public string ListType { get; set; } = "blacklist"; // whitelist, blacklist
    public string MatchType { get; set; } = "email"; // email, domain
    public string Value { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
