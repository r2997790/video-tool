using Microsoft.EntityFrameworkCore;
using VideoTool.Domain.Entities;

namespace VideoTool.Data;

public class VideoToolDbContext : DbContext
{
    public VideoToolDbContext(DbContextOptions<VideoToolDbContext> options) : base(options) { }

    public DbSet<DemoConfig> DemoConfigs => Set<DemoConfig>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<ChapterVideo> ChapterVideos => Set<ChapterVideo>();
    public DbSet<SeedChatMessage> SeedChatMessages => Set<SeedChatMessage>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<FlowProject> FlowProjects => Set<FlowProject>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<VideoToaster> VideoToasters => Set<VideoToaster>();
    public DbSet<ChapterViewRecord> ChapterViewRecords => Set<ChapterViewRecord>();
    public DbSet<EngagementEvent> EngagementEvents => Set<EngagementEvent>();
    public DbSet<VideoPausePoint> VideoPausePoints => Set<VideoPausePoint>();
    public DbSet<ScheduledEvent> ScheduledEvents => Set<ScheduledEvent>();
    public DbSet<ChatSessionMapping> ChatSessionMappings => Set<ChatSessionMapping>();
    public DbSet<LeadSubmission> LeadSubmissions => Set<LeadSubmission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ChapterViewRecord>()
            .HasIndex(r => new { r.SessionId, r.ChapterId })
            .IsUnique();

        modelBuilder.Entity<ChatSessionMapping>()
            .HasIndex(m => m.SessionId)
            .IsUnique();

        modelBuilder.Entity<DemoConfig>().HasData(new DemoConfig
        {
            Id = 1,
            Autoplay = false,
            ShowDuration = true,
            ChatEnabled = true,
            AiEnabled = true,
            NotificationsEnabled = false,
            LiveChatEnabled = false,
            SeedChatEnabled = false,
            ChapterPickEnabled = true,
            PauseEnabled = true,
            AiSystemPrompt = "You are a knowledgeable assistant for Empauer — a sustainability software company. Answer questions about the demo, products, and sustainability topics concisely and professionally.",
            ThemePrimaryColor = "#77c043",
            ThemeAccentColor = "#4f8a28",
            ThemeBackgroundColor = "#0f1011",
            ThemeSurfaceColor = "#1a1b1d",
            ThemeTextColor = "#e8e8e8",
            ThemeFontFamily = "Poppins",
            ThemeBrandName = "Empauer",
            ThemeChatTitle = "Ask Empauer",
            UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        modelBuilder.Entity<FlowProject>()
            .HasIndex(f => f.Slug)
            .IsUnique();

        modelBuilder.Entity<Chapter>()
            .HasIndex(c => new { c.FlowProjectId, c.Slug })
            .IsUnique();

        modelBuilder.Entity<ChapterVideo>()
            .HasIndex(v => v.ChapterId);

        modelBuilder.Entity<VideoToaster>()
            .HasIndex(t => t.FlowProjectId);

        modelBuilder.Entity<VideoPausePoint>()
            .HasIndex(p => p.FlowProjectId);

        modelBuilder.Entity<SeedChatMessage>()
            .HasIndex(m => m.FlowProjectId);

        modelBuilder.Entity<EngagementEvent>()
            .HasIndex(e => e.FlowSlug);

        modelBuilder.Entity<ChatMessage>()
            .HasIndex(m => m.FlowSlug);

        modelBuilder.Entity<LeadSubmission>()
            .HasIndex(l => l.FlowSlug);

        modelBuilder.Entity<FlowProject>().HasData(new FlowProject
        {
            Id = 1,
            Slug = "default",
            ProjectName = "Demo Flow",
            ProjectDataJson = """{"projectName":"Demo Flow","nodes":[],"connections":[]}""",
            IsEnabled = true,
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
