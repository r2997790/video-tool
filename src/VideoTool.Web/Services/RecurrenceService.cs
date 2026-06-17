using System.Text.Json;
using VideoTool.Domain.Entities;

namespace VideoTool.Web.Services;

public class WeeklySchedule
{
    public List<string> Days { get; set; } = [];
    public List<string> Times { get; set; } = [];
}

public class RecurrenceService
{
    private static readonly Dictionary<string, DayOfWeek> DayMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Sun"] = DayOfWeek.Sunday,
        ["Mon"] = DayOfWeek.Monday,
        ["Tue"] = DayOfWeek.Tuesday,
        ["Wed"] = DayOfWeek.Wednesday,
        ["Thu"] = DayOfWeek.Thursday,
        ["Fri"] = DayOfWeek.Friday,
        ["Sat"] = DayOfWeek.Saturday,
        ["Sunday"] = DayOfWeek.Sunday,
        ["Monday"] = DayOfWeek.Monday,
        ["Tuesday"] = DayOfWeek.Tuesday,
        ["Wednesday"] = DayOfWeek.Wednesday,
        ["Thursday"] = DayOfWeek.Thursday,
        ["Friday"] = DayOfWeek.Friday,
        ["Saturday"] = DayOfWeek.Saturday,
    };

    public DateTime? GetNextOccurrenceUtc(ScheduledEvent ev, DateTime nowUtc)
    {
        var type = NormalizeType(ev.RecurrenceType);
        return type switch
        {
            "interval" => GetNextIntervalOccurrence(ev, nowUtc, strictlyAfter: true),
            "weekly" => GetNextWeeklyOccurrence(ev, nowUtc, strictlyAfter: true),
            _ => ev.StartsAtUtc > nowUtc ? ev.StartsAtUtc : null,
        };
    }

    public DateTime? GetCurrentOccurrenceUtc(ScheduledEvent ev, DateTime nowUtc)
    {
        var kind = NormalizeKind(ev.EventKind);
        if (kind == "on_demand" && ev.OnDemandLiveStartUtc.HasValue)
            return IsWithinLiveWindow(ev, ev.OnDemandLiveStartUtc.Value, nowUtc) ? ev.OnDemandLiveStartUtc : null;

        if (kind == "instant")
            return nowUtc >= ev.StartsAtUtc && IsWithinLiveWindow(ev, ev.StartsAtUtc, nowUtc) ? ev.StartsAtUtc : null;

        var type = NormalizeType(ev.RecurrenceType);
        return type switch
        {
            "interval" => GetCurrentIntervalOccurrence(ev, nowUtc),
            "weekly" => GetCurrentWeeklyOccurrence(ev, nowUtc),
            _ => nowUtc >= ev.StartsAtUtc && IsWithinLiveWindow(ev, ev.StartsAtUtc, nowUtc) ? ev.StartsAtUtc : null,
        };
    }

    public bool IsLive(ScheduledEvent ev, DateTime nowUtc)
    {
        if (!ev.IsEnabled) return false;

        var kind = NormalizeKind(ev.EventKind);
        if (kind == "on_demand" && ev.OnDemandLiveStartUtc.HasValue)
            return IsWithinLiveWindow(ev, ev.OnDemandLiveStartUtc.Value, nowUtc);

        if (kind == "instant")
            return IsWithinLiveWindow(ev, ev.StartsAtUtc, nowUtc);

        return GetCurrentOccurrenceUtc(ev, nowUtc) != null;
    }

    public DateTime? GetNextStartsAtUtc(ScheduledEvent ev, DateTime nowUtc)
    {
        if (IsLive(ev, nowUtc))
            return GetCurrentOccurrenceUtc(ev, nowUtc);

        var next = GetNextOccurrenceUtc(ev, nowUtc);
        if (next.HasValue) return next;

        var type = NormalizeType(ev.RecurrenceType);
        if (type == "none" && nowUtc < ev.StartsAtUtc)
            return ev.StartsAtUtc;

        return null;
    }

    public DateTime? GetLastOccurrenceUtc(ScheduledEvent ev, DateTime nowUtc)
    {
        if (NormalizeKind(ev.EventKind) == "on_demand" && ev.OnDemandLiveStartUtc.HasValue)
            return ev.OnDemandLiveStartUtc;

        if (NormalizeKind(ev.EventKind) == "instant")
            return ev.StartsAtUtc <= nowUtc ? ev.StartsAtUtc : null;

        var type = NormalizeType(ev.RecurrenceType);
        if (type == "none")
            return ev.StartsAtUtc <= nowUtc ? ev.StartsAtUtc : null;

        // Walk back from now to find most recent occurrence
        var probe = nowUtc;
        DateTime? last = null;
        for (var i = 0; i < 500; i++)
        {
            var current = GetCurrentOccurrenceUtc(ev, probe);
            if (current.HasValue)
            {
                last = current;
                break;
            }
            var prev = GetPreviousOccurrenceUtc(ev, probe);
            if (!prev.HasValue) break;
            last = prev;
            probe = prev.Value.AddSeconds(-1);
            if (i > 0 && prev == last) break;
        }
        return last;
    }

    public string GetEventDisplayStatus(ScheduledEvent ev, DateTime nowUtc)
    {
        if (!ev.IsEnabled) return "inactive";

        if (IsLive(ev, nowUtc))
        {
            if (NormalizeKind(ev.EventKind) == "instant") return "instant";
            return "live";
        }

        var next = GetNextOccurrenceUtc(ev, nowUtc);
        if (next.HasValue || (NormalizeType(ev.RecurrenceType) == "none" && nowUtc < ev.StartsAtUtc))
            return "programmed";

        if (NormalizeKind(ev.EventKind) == "on_demand" && !ev.OnDemandLiveStartUtc.HasValue)
            return "programmed";

        return "past";
    }

    private static string NormalizeKind(string? kind) =>
        string.IsNullOrWhiteSpace(kind) ? "scheduled" : kind.Trim().ToLowerInvariant();

    private DateTime? GetPreviousOccurrenceUtc(ScheduledEvent ev, DateTime nowUtc)
    {
        var type = NormalizeType(ev.RecurrenceType);
        return type switch
        {
            "interval" => GetPreviousIntervalOccurrence(ev, nowUtc),
            "weekly" => GetPreviousWeeklyOccurrence(ev, nowUtc),
            _ => ev.StartsAtUtc < nowUtc ? ev.StartsAtUtc : null,
        };
    }

    private static string NormalizeType(string? type) =>
        string.IsNullOrWhiteSpace(type) ? "none" : type.Trim().ToLowerInvariant();

    private static bool IsWithinLiveWindow(ScheduledEvent ev, DateTime occurrenceStartUtc, DateTime nowUtc)
    {
        if (nowUtc < occurrenceStartUtc) return false;

        if (ev.LiveDurationMinutes is > 0)
            return nowUtc <= occurrenceStartUtc.AddMinutes(ev.LiveDurationMinutes.Value);

        var type = NormalizeType(ev.RecurrenceType);
        if (type == "none") return true;

        var next = type switch
        {
            "interval" => GetNextIntervalOccurrence(ev, occurrenceStartUtc.AddSeconds(1), strictlyAfter: true),
            "weekly" => GetNextWeeklyOccurrence(ev, occurrenceStartUtc.AddSeconds(1), strictlyAfter: true),
            _ => null,
        };

        return !next.HasValue || nowUtc < next.Value;
    }

    private static DateTime? GetNextIntervalOccurrence(ScheduledEvent ev, DateTime nowUtc, bool strictlyAfter)
    {
        var interval = ev.IntervalMinutes ?? 0;
        if (interval <= 0) return null;

        var anchor = EnsureUtc(ev.RecurrenceStartUtc ?? ev.StartsAtUtc);
        var end = ev.RecurrenceEndUtc.HasValue ? EnsureUtc(ev.RecurrenceEndUtc.Value) : (DateTime?)null;

        if (end.HasValue && nowUtc > end.Value && anchor > end.Value) return null;

        var t = anchor;
        if (strictlyAfter && t <= nowUtc)
        {
            var elapsed = (nowUtc - anchor).TotalMinutes;
            var steps = (long)Math.Floor(elapsed / interval) + 1;
            t = anchor.AddMinutes(steps * interval);
        }
        else if (!strictlyAfter && t < nowUtc)
        {
            var elapsed = (nowUtc - anchor).TotalMinutes;
            var steps = (long)Math.Floor(elapsed / interval);
            t = anchor.AddMinutes(steps * interval);
        }

        if (end.HasValue && t > end.Value) return null;
        return t;
    }

    private static DateTime? GetCurrentIntervalOccurrence(ScheduledEvent ev, DateTime nowUtc)
    {
        var interval = ev.IntervalMinutes ?? 0;
        if (interval <= 0) return null;

        var anchor = EnsureUtc(ev.RecurrenceStartUtc ?? ev.StartsAtUtc);
        var end = ev.RecurrenceEndUtc.HasValue ? EnsureUtc(ev.RecurrenceEndUtc.Value) : (DateTime?)null;
        if (nowUtc < anchor) return null;

        var elapsed = (nowUtc - anchor).TotalMinutes;
        var idx = (long)Math.Floor(elapsed / interval);
        var currentStart = anchor.AddMinutes(idx * interval);
        if (end.HasValue && currentStart > end.Value) return null;

        return IsWithinLiveWindow(ev, currentStart, nowUtc) ? currentStart : null;
    }

    private static DateTime? GetPreviousIntervalOccurrence(ScheduledEvent ev, DateTime nowUtc)
    {
        var interval = ev.IntervalMinutes ?? 0;
        if (interval <= 0) return null;

        var anchor = EnsureUtc(ev.RecurrenceStartUtc ?? ev.StartsAtUtc);
        if (nowUtc < anchor) return null;

        var elapsed = (nowUtc - anchor).TotalMinutes;
        var idx = (long)Math.Floor(elapsed / interval);
        if (idx < 0) return null;
        return anchor.AddMinutes(idx * interval);
    }

    private static DateTime? GetPreviousWeeklyOccurrence(ScheduledEvent ev, DateTime nowUtc)
    {
        var schedule = ParseWeeklySchedule(ev.WeeklyScheduleJson);
        if (schedule.Days.Count == 0 || schedule.Times.Count == 0) return null;

        var tz = ResolveTimeZone(ev.Timezone);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

        for (var dayOffset = 0; dayOffset >= -14; dayOffset--)
        {
            var day = localNow.Date.AddDays(dayOffset);
            var dow = day.DayOfWeek;
            if (!schedule.Days.Any(d => DayMap.TryGetValue(d, out var mapped) && mapped == dow))
                continue;

            foreach (var time in schedule.Times.OrderByDescending(t => t))
            {
                if (!TryParseTime(time, out var hour, out var minute)) continue;
                var localSlot = day.AddHours(hour).AddMinutes(minute);
                var slotUtc = TimeZoneInfo.ConvertTimeToUtc(localSlot, tz);
                if (slotUtc <= nowUtc) return slotUtc;
            }
        }

        return null;
    }

    private static DateTime? GetNextWeeklyOccurrence(ScheduledEvent ev, DateTime nowUtc, bool strictlyAfter)
    {
        var schedule = ParseWeeklySchedule(ev.WeeklyScheduleJson);
        if (schedule.Days.Count == 0 || schedule.Times.Count == 0) return null;

        var tz = ResolveTimeZone(ev.Timezone);
        var end = ev.RecurrenceEndUtc.HasValue ? EnsureUtc(ev.RecurrenceEndUtc.Value) : (DateTime?)null;
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

        for (var dayOffset = 0; dayOffset < 14; dayOffset++)
        {
            var day = localNow.Date.AddDays(dayOffset);
            var dow = day.DayOfWeek;
            if (!schedule.Days.Any(d => DayMap.TryGetValue(d, out var mapped) && mapped == dow))
                continue;

            foreach (var time in schedule.Times.OrderBy(t => t))
            {
                if (!TryParseTime(time, out var hour, out var minute)) continue;
                var localSlot = day.AddHours(hour).AddMinutes(minute);
                var slotUtc = TimeZoneInfo.ConvertTimeToUtc(localSlot, tz);
                if (end.HasValue && slotUtc > end.Value) continue;
                if (strictlyAfter && slotUtc <= nowUtc) continue;
                if (!strictlyAfter && slotUtc < nowUtc) continue;
                return slotUtc;
            }
        }

        return null;
    }

    private static DateTime? GetCurrentWeeklyOccurrence(ScheduledEvent ev, DateTime nowUtc)
    {
        var schedule = ParseWeeklySchedule(ev.WeeklyScheduleJson);
        if (schedule.Days.Count == 0 || schedule.Times.Count == 0) return null;

        var tz = ResolveTimeZone(ev.Timezone);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

        for (var dayOffset = -1; dayOffset <= 0; dayOffset++)
        {
            var day = localNow.Date.AddDays(dayOffset);
            var dow = day.DayOfWeek;
            if (!schedule.Days.Any(d => DayMap.TryGetValue(d, out var mapped) && mapped == dow))
                continue;

            foreach (var time in schedule.Times.OrderByDescending(t => t))
            {
                if (!TryParseTime(time, out var hour, out var minute)) continue;
                var localSlot = day.AddHours(hour).AddMinutes(minute);
                var slotUtc = TimeZoneInfo.ConvertTimeToUtc(localSlot, tz);
                if (slotUtc <= nowUtc && IsWithinLiveWindow(ev, slotUtc, nowUtc))
                    return slotUtc;
            }
        }

        return null;
    }

    public static WeeklySchedule ParseWeeklySchedule(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new WeeklySchedule();
        try
        {
            return JsonSerializer.Deserialize<WeeklySchedule>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                   ?? new WeeklySchedule();
        }
        catch
        {
            return new WeeklySchedule();
        }
    }

    private static TimeZoneInfo ResolveTimeZone(string? timezone)
    {
        if (string.IsNullOrWhiteSpace(timezone)) return TimeZoneInfo.Utc;
        try { return TimeZoneInfo.FindSystemTimeZoneById(timezone); }
        catch { return TimeZoneInfo.Utc; }
    }

    private static bool TryParseTime(string raw, out int hour, out int minute)
    {
        hour = 0;
        minute = 0;
        var parts = raw.Trim().Split(':');
        return parts.Length >= 2
               && int.TryParse(parts[0], out hour)
               && int.TryParse(parts[1], out minute)
               && hour is >= 0 and < 24
               && minute is >= 0 and < 60;
    }

    private static DateTime EnsureUtc(DateTime dt) =>
        dt.Kind == DateTimeKind.Utc ? dt : DateTime.SpecifyKind(dt, DateTimeKind.Utc);
}
