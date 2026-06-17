using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Domain.Entities;

namespace VideoTool.Web.Services;

public class AccessOverrideConfig
{
    public List<string> WhitelistAdd { get; set; } = [];
    public List<string> WhitelistRemove { get; set; } = [];
    public List<string> BlacklistAdd { get; set; } = [];
    public List<string> BlacklistRemove { get; set; } = [];
}

public class EventAccessService
{
    public async Task<bool> IsBlacklistedAsync(VideoToolDbContext db, string email, ScheduledEvent? ev = null)
    {
        var normalized = NormalizeEmail(email);
        if (string.IsNullOrEmpty(normalized)) return true;

        var domain = GetDomain(normalized);
        var config = await db.DemoConfigs.AsNoTracking().FirstAsync();
        var blockedDomains = ParseJsonList(config.BlockedEmailDomainsJson);

        if (blockedDomains.Any(d => DomainMatches(domain, d)))
            return true;

        var globalBlacklist = await db.GlobalAccessListEntries.AsNoTracking()
            .Where(e => e.ListType == "blacklist")
            .ToListAsync();

        var overrides = ParseOverrides(ev?.AccessOverrideJson);

        foreach (var entry in globalBlacklist)
        {
            if (overrides.BlacklistRemove.Contains(entry.Value, StringComparer.OrdinalIgnoreCase)) continue;
            if (MatchesEntry(normalized, domain, entry)) return true;
        }

        foreach (var val in overrides.BlacklistAdd)
        {
            if (MatchesValue(normalized, domain, val)) return true;
        }

        return false;
    }

    public async Task<bool> IsWhitelistedAsync(VideoToolDbContext db, string email, ScheduledEvent? ev = null)
    {
        var normalized = NormalizeEmail(email);
        if (string.IsNullOrEmpty(normalized)) return false;

        var domain = GetDomain(normalized);
        var globalWhitelist = await db.GlobalAccessListEntries.AsNoTracking()
            .Where(e => e.ListType == "whitelist")
            .ToListAsync();

        var overrides = ParseOverrides(ev?.AccessOverrideJson);

        foreach (var entry in globalWhitelist)
        {
            if (overrides.WhitelistRemove.Contains(entry.Value, StringComparer.OrdinalIgnoreCase)) continue;
            if (MatchesEntry(normalized, domain, entry)) return true;
        }

        foreach (var val in overrides.WhitelistAdd)
        {
            if (MatchesValue(normalized, domain, val)) return true;
        }

        return false;
    }

    public async Task<bool> CanAccessAsync(VideoToolDbContext db, ScheduledEvent ev, string? email)
    {
        if (ev.AccessMode != "selective") return true;

        if (!string.IsNullOrWhiteSpace(email))
        {
            if (await IsBlacklistedAsync(db, email, ev)) return false;
            if (await IsWhitelistedAsync(db, email, ev)) return true;

            var normalized = NormalizeEmail(email);
            var attendee = await db.EventAttendees.AsNoTracking()
                .FirstOrDefaultAsync(a => a.EventId == ev.Id && a.Email == normalized);
            if (attendee?.Status == "approved") return true;
        }

        return false;
    }

    public async Task<bool> CanRegisterAsync(VideoToolDbContext db, ScheduledEvent ev, string email)
    {
        if (await IsBlacklistedAsync(db, email, ev)) return false;
        return true;
    }

    public static string NormalizeEmail(string email) =>
        email.Trim().ToLowerInvariant();

    private static string GetDomain(string email)
    {
        var at = email.LastIndexOf('@');
        return at >= 0 ? email[(at + 1)..] : "";
    }

    private static bool DomainMatches(string domain, string pattern)
    {
        pattern = pattern.Trim().ToLowerInvariant().TrimStart('@');
        return domain.Equals(pattern, StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesEntry(string email, string domain, GlobalAccessListEntry entry)
    {
        var val = entry.Value.Trim().ToLowerInvariant();
        return entry.MatchType == "domain"
            ? DomainMatches(domain, val)
            : email.Equals(val, StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesValue(string email, string domain, string raw)
    {
        var val = raw.Trim().ToLowerInvariant();
        if (val.StartsWith('@') || val.Contains('.') && !val.Contains('@'))
            return DomainMatches(domain, val);
        return email.Equals(val, StringComparison.OrdinalIgnoreCase);
    }

    private static AccessOverrideConfig ParseOverrides(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new AccessOverrideConfig();
        try
        {
            return JsonSerializer.Deserialize<AccessOverrideConfig>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new AccessOverrideConfig();
        }
        catch
        {
            return new AccessOverrideConfig();
        }
    }

    private static List<string> ParseJsonList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return []; }
    }
}
