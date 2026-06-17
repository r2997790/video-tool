using Xunit;
using VideoTool.Domain.Entities;
using VideoTool.Web.Services;

namespace VideoTool.Tests;

public class RecurrenceServiceTests
{
    private readonly RecurrenceService _svc = new();

    [Fact]
    public void OneShot_FutureStart_ReturnsStartsAt()
    {
        var ev = new ScheduledEvent
        {
            StartsAtUtc = new DateTime(2026, 6, 20, 10, 0, 0, DateTimeKind.Utc),
            RecurrenceType = "none",
        };
        var now = new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc);

        Assert.Equal(ev.StartsAtUtc, _svc.GetNextStartsAtUtc(ev, now));
        Assert.False(_svc.IsLive(ev, now));
    }

    [Fact]
    public void OneShot_AfterStart_IsLive()
    {
        var ev = new ScheduledEvent
        {
            StartsAtUtc = new DateTime(2026, 6, 10, 10, 0, 0, DateTimeKind.Utc),
            RecurrenceType = "none",
        };
        var now = new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc);

        Assert.True(_svc.IsLive(ev, now));
        Assert.Equal(ev.StartsAtUtc, _svc.GetNextStartsAtUtc(ev, now));
    }

    [Fact]
    public void Interval_ComputesNextOccurrence()
    {
        var anchor = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var ev = new ScheduledEvent
        {
            StartsAtUtc = anchor,
            RecurrenceType = "interval",
            RecurrenceStartUtc = anchor,
            IntervalMinutes = 60,
        };
        var now = new DateTime(2026, 6, 1, 2, 30, 0, DateTimeKind.Utc);

        var next = _svc.GetNextOccurrenceUtc(ev, now);
        Assert.Equal(new DateTime(2026, 6, 1, 3, 0, 0, DateTimeKind.Utc), next);
    }

    [Fact]
    public void Interval_DuringLiveWindow_IsLive()
    {
        var anchor = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var ev = new ScheduledEvent
        {
            StartsAtUtc = anchor,
            RecurrenceType = "interval",
            RecurrenceStartUtc = anchor,
            IntervalMinutes = 120,
            LiveDurationMinutes = 30,
        };
        var now = new DateTime(2026, 6, 1, 0, 15, 0, DateTimeKind.Utc);

        Assert.True(_svc.IsLive(ev, now));
    }

    [Fact]
    public void Interval_BetweenWindows_NotLive()
    {
        var anchor = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var ev = new ScheduledEvent
        {
            StartsAtUtc = anchor,
            RecurrenceType = "interval",
            RecurrenceStartUtc = anchor,
            IntervalMinutes = 120,
            LiveDurationMinutes = 30,
        };
        var now = new DateTime(2026, 6, 1, 1, 0, 0, DateTimeKind.Utc);

        Assert.False(_svc.IsLive(ev, now));
        Assert.NotNull(_svc.GetNextOccurrenceUtc(ev, now));
    }

    [Fact]
    public void Weekly_ParsesScheduleJson()
    {
        var schedule = RecurrenceService.ParseWeeklySchedule("""{"days":["Mon","Wed"],"times":["09:30","16:30"]}""");
        Assert.Equal(2, schedule.Days.Count);
        Assert.Equal(2, schedule.Times.Count);
    }

    [Fact]
    public void Weekly_FindsNextSlot()
    {
        var ev = new ScheduledEvent
        {
            StartsAtUtc = new DateTime(2026, 6, 9, 0, 0, 0, DateTimeKind.Utc),
            RecurrenceType = "weekly",
            Timezone = "UTC",
            WeeklyScheduleJson = """{"days":["Mon","Wed","Fri"],"times":["09:30","16:30"]}""",
        };
        // Wednesday 2026-06-10 08:00 UTC -> next is 09:30 same day
        var now = new DateTime(2026, 6, 10, 8, 0, 0, DateTimeKind.Utc);
        var next = _svc.GetNextOccurrenceUtc(ev, now);
        Assert.Equal(new DateTime(2026, 6, 10, 9, 30, 0, DateTimeKind.Utc), next);
    }

    [Fact]
    public void DisplayStatus_Inactive_WhenDisabled()
    {
        var ev = new ScheduledEvent { IsEnabled = false, RecurrenceType = "none", StartsAtUtc = DateTime.UtcNow.AddHours(1) };
        Assert.Equal("inactive", _svc.GetEventDisplayStatus(ev, DateTime.UtcNow));
    }

    [Fact]
    public void DisplayStatus_Programmed_WhenFutureOneShot()
    {
        var ev = new ScheduledEvent
        {
            IsEnabled = true,
            RecurrenceType = "none",
            StartsAtUtc = new DateTime(2026, 12, 1, 10, 0, 0, DateTimeKind.Utc),
        };
        var now = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        Assert.Equal("programmed", _svc.GetEventDisplayStatus(ev, now));
    }

    [Fact]
    public void DisplayStatus_Past_WhenOneShotEnded()
    {
        var ev = new ScheduledEvent
        {
            IsEnabled = true,
            RecurrenceType = "none",
            StartsAtUtc = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc),
            LiveDurationMinutes = 30,
        };
        var now = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        Assert.Equal("past", _svc.GetEventDisplayStatus(ev, now));
    }

    [Fact]
    public void InstantEvent_IsLiveImmediately()
    {
        var now = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);
        var ev = new ScheduledEvent
        {
            IsEnabled = true,
            EventKind = "instant",
            StartsAtUtc = now,
            RecurrenceType = "none",
            LiveDurationMinutes = 60,
        };
        Assert.True(_svc.IsLive(ev, now));
        Assert.Equal("instant", _svc.GetEventDisplayStatus(ev, now));
    }
}
