namespace VideoTool.Domain.Entities;

public class PrivacyPolicyRegion
{
    public int Id { get; set; }
    public string RegionCode { get; set; } = "DEFAULT"; // EU, UK, US, DEFAULT
    public string NoticeHtml { get; set; } = string.Empty;
    public bool ConsentRequired { get; set; }
    public string? PolicyUrl { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
