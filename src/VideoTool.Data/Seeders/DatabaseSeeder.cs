using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VideoTool.Domain.Entities;

namespace VideoTool.Data.Seeders;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(VideoToolDbContext db, string adminPassword)
    {
        await db.Database.EnsureCreatedAsync();

        if (!await db.AdminUsers.AnyAsync())
        {
            db.AdminUsers.Add(new AdminUser
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                IsActive = true,
                MustChangePassword = true,
            });
        }
        else if (ShouldSyncAdminPassword())
        {
            var admin = await db.AdminUsers.FirstOrDefaultAsync(u => u.Username == "admin");
            if (admin != null)
            {
                admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
                admin.MustChangePassword = false;
            }
        }

        await db.SaveChangesAsync();

        var defaultFlow = await db.FlowProjects.FirstOrDefaultAsync(f => f.Slug == "default")
            ?? await db.FlowProjects.FirstAsync();

        if (!await db.Chapters.AnyAsync())
        {
            var gateJson = JsonSerializer.Serialize(new
            {
                heading = "Unlock this chapter",
                subtext = "Share a few details to access the full platform walkthrough.",
                questions = new[]
                {
                    new { id = "name", label = "Full name", type = "text", placeholder = "Jane Smith", required = true },
                    new { id = "company", label = "Organisation", type = "text", placeholder = "Your company", required = true },
                    new { id = "email", label = "Work email", type = "email", placeholder = "jane@company.com", required = true }
                }
            });

            db.Chapters.AddRange(
                new Chapter { FlowProjectId = defaultFlow.Id, Slug = "overview", Name = "Empauer Overview", Description = "What Empauer does and why it matters.", VideoLink = "dQw4w9WgXcQ", Duration = "2:30", SortOrder = 1 },
                new Chapter { FlowProjectId = defaultFlow.Id, Slug = "direct-intro", Name = "Introducing Direct", Description = "Food loss and waste intelligence for your business.", VideoLink = "dQw4w9WgXcQ", Duration = "3:45", SortOrder = 2 },
                new Chapter { FlowProjectId = defaultFlow.Id, Slug = "direct-demo", Name = "Direct — Platform walkthrough", Description = "See how Direct maps and measures waste across your supply chain.", VideoLink = "dQw4w9WgXcQ", Duration = "6:15", SortOrder = 3, IsLocked = true, GateJson = gateJson },
                new Chapter { FlowProjectId = defaultFlow.Id, Slug = "venta-intro", Name = "Introducing Venta", Description = "Packaging governance and specification made clear.", VideoLink = "dQw4w9WgXcQ", Duration = "3:10", SortOrder = 4 },
                new Chapter { FlowProjectId = defaultFlow.Id, Slug = "venta-demo", Name = "Venta — Platform walkthrough", Description = "See how Venta manages specs, compliance and product data.", VideoLink = "dQw4w9WgXcQ", Duration = "5:20", SortOrder = 5 }
            );
        }

        if (!await db.SeedChatMessages.AnyAsync())
        {
            db.SeedChatMessages.Add(new SeedChatMessage
            {
                FlowProjectId = defaultFlow.Id,
                Role = "assistant",
                Text = "Hi there. I can answer questions about this demo, Empauer's products Direct and Venta, or sustainability topics. What would you like to know?",
                SortOrder = 1
            });
        }

        await db.SaveChangesAsync();

        await SeedTestFlowAsync(db);
        await SeedTestEventAsync(db);

        await db.SaveChangesAsync();
    }

    private static async Task SeedTestFlowAsync(VideoToolDbContext db)
    {
        if (await db.FlowProjects.AnyAsync(f => f.Slug == "test-demo"))
            return;

        var defaultFlow = await db.FlowProjects.FirstOrDefaultAsync(f => f.Slug == "default")
            ?? await db.FlowProjects.FirstAsync();
        var defaultFlowId = defaultFlow.Id;
        var defaultChapters = await db.Chapters.AsNoTracking()
            .Where(c => c.FlowProjectId == defaultFlowId)
            .ToListAsync();
        var overviewSrc = defaultChapters.FirstOrDefault(c => c.Slug == "overview");
        var directIntroSrc = defaultChapters.FirstOrDefault(c => c.Slug == "direct-intro");
        var ventaIntroSrc = defaultChapters.FirstOrDefault(c => c.Slug == "venta-intro");
        if (overviewSrc == null || directIntroSrc == null || ventaIntroSrc == null)
            return;

        var testFlow = new FlowProject
        {
            Slug = "test-demo",
            ProjectName = "Test Demo (YouTube)",
            ProjectDataJson = "{}",
            IsEnabled = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.FlowProjects.Add(testFlow);
        await db.SaveChangesAsync();

        async Task<Chapter> CopyChapter(Chapter src)
        {
            var copy = new Chapter
            {
                FlowProjectId = testFlow.Id,
                Slug = src.Slug,
                Name = src.Name,
                Description = src.Description,
                VideoLink = src.VideoLink,
                Duration = src.Duration,
                SortOrder = src.SortOrder,
                IsLocked = src.IsLocked,
                ShowDuration = src.ShowDuration,
                GateJson = src.GateJson,
            };
            db.Chapters.Add(copy);
            await db.SaveChangesAsync();
            return copy;
        }

        var overview = await CopyChapter(overviewSrc);
        var directIntro = await CopyChapter(directIntroSrc);
        var ventaIntro = await CopyChapter(ventaIntroSrc);

        var projectData = new
        {
            projectName = "Test Demo (YouTube)",
            nodes = new object[]
            {
                new { id = "start-1", type = "question", name = "Welcome", x = 80, y = 120, parameters = new { prompt = "Test demo flow", subtext = "Sample flow for QA — plays three YouTube chapters.", fieldId = "welcome", inputType = "text", required = false } },
                new { id = "ch-1", type = "chapter", name = "Overview", x = 320, y = 120, parameters = new { chapterId = overview.Id } },
                new { id = "ch-2", type = "chapter", name = "Direct Intro", x = 560, y = 120, parameters = new { chapterId = directIntro.Id } },
                new { id = "ch-3", type = "chapter", name = "Venta Intro", x = 800, y = 120, parameters = new { chapterId = ventaIntro.Id } },
            },
            connections = new[]
            {
                new { from = "start-1", to = "ch-1" },
                new { from = "ch-1", to = "ch-2" },
                new { from = "ch-2", to = "ch-3" },
            }
        };

        testFlow.ProjectDataJson = JsonSerializer.Serialize(projectData);
        testFlow.UpdatedAt = DateTime.UtcNow;
    }

    private static async Task SeedTestEventAsync(VideoToolDbContext db)
    {
        if (await db.ScheduledEvents.AnyAsync(e => e.Slug == "test-event"))
            return;

        if (!await db.FlowProjects.AnyAsync(f => f.Slug == "test-demo"))
            return;

        var testFlowId = await db.FlowProjects.AsNoTracking()
            .Where(f => f.Slug == "test-demo")
            .Select(f => f.Id)
            .FirstOrDefaultAsync();
        if (testFlowId == 0) return;

        var overview = await db.Chapters.AsNoTracking()
            .FirstOrDefaultAsync(c => c.FlowProjectId == testFlowId && c.Slug == "overview");

        db.ScheduledEvents.Add(new ScheduledEvent
        {
            Slug = "test-event",
            Title = "Test Broadcast",
            FlowSlug = "test-demo",
            StartsAtUtc = DateTime.UtcNow.AddHours(-1),
            HoldingHeading = "Test event lobby",
            HoldingMessage = "Waiting room with a YouTube preview video.",
            HoldingVideoUrl = "jNQXAC9IVRw",
            HoldingVideoType = "youtube",
            DefaultChapterId = overview?.Id,
            RecurrenceType = "none",
            Timezone = "UTC",
            LiveDurationMinutes = 120,
            IsEnabled = true,
        });
    }

    private static bool ShouldSyncAdminPassword()
    {
        var flag = Environment.GetEnvironmentVariable("SYNC_ADMIN_PASSWORD");
        return flag is "1" or "true" or "TRUE";
    }
}
