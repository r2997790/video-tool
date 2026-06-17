using System.Text.Json;
using VideoTool.Data;
using VideoTool.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace VideoTool.Web.Services;

public class PrivacyPolicyService
{
    private static readonly HashSet<string> EuCountryCodes = new(StringComparer.OrdinalIgnoreCase)
    {
        "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
        "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO"
    };

    private static readonly HashSet<string> EuTimezones = new(StringComparer.OrdinalIgnoreCase)
    {
        "Europe/London", "Europe/Dublin", "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam",
        "Europe/Brussels", "Europe/Madrid", "Europe/Rome", "Europe/Vienna", "Europe/Warsaw",
        "Europe/Stockholm", "Europe/Copenhagen", "Europe/Helsinki", "Europe/Athens",
        "Europe/Lisbon", "Europe/Prague", "Europe/Budapest", "Europe/Bucharest"
    };

    public string ResolveRegion(string? locale, string? timezone)
    {
        var lang = (locale ?? "").Split('-', '_')[0].ToUpperInvariant();
        var region = (locale ?? "").Contains('-') || (locale ?? "").Contains('_')
            ? (locale ?? "").Split('-', '_').Last().ToUpperInvariant()
            : "";

        if (region == "GB" || timezone?.Contains("London", StringComparison.OrdinalIgnoreCase) == true)
            return "UK";

        if (!string.IsNullOrEmpty(region) && EuCountryCodes.Contains(region))
            return "EU";

        if (!string.IsNullOrEmpty(timezone) && EuTimezones.Contains(timezone))
            return timezone.Contains("London", StringComparison.OrdinalIgnoreCase) ? "UK" : "EU";

        if (lang == "EN" && region == "US") return "US";
        if (region == "US" || region == "CA") return "US";

        return "DEFAULT";
    }

    public async Task<PrivacyPolicyRegion> GetPolicyAsync(VideoToolDbContext db, string regionCode, ScheduledEvent? ev = null)
    {
        if (!string.IsNullOrWhiteSpace(ev?.PrivacyPolicyOverrideJson))
        {
            try
            {
                var overrides = JsonSerializer.Deserialize<Dictionary<string, PrivacyOverride>>(ev.PrivacyPolicyOverrideJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (overrides?.TryGetValue(regionCode, out var ov) == true && ov != null)
                {
                    return new PrivacyPolicyRegion
                    {
                        RegionCode = regionCode,
                        NoticeHtml = ov.NoticeHtml ?? "",
                        ConsentRequired = ov.ConsentRequired,
                        PolicyUrl = ov.PolicyUrl,
                    };
                }
            }
            catch { /* fall through */ }
        }

        var policy = await db.PrivacyPolicyRegions.AsNoTracking()
            .FirstOrDefaultAsync(p => p.RegionCode == regionCode);
        if (policy != null) return policy;

        return await db.PrivacyPolicyRegions.AsNoTracking()
            .FirstAsync(p => p.RegionCode == "DEFAULT");
    }

    public class PrivacyOverride
    {
        public string? NoticeHtml { get; set; }
        public bool ConsentRequired { get; set; }
        public string? PolicyUrl { get; set; }
    }
}
