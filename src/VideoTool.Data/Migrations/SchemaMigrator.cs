using Microsoft.EntityFrameworkCore;
using VideoTool.Data;

namespace VideoTool.Data.Migrations;

public static class SchemaMigrator
{
    public static async Task ApplyAsync(VideoToolDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        var conn = db.Database.GetDbConnection();
        var isSqlite = conn.DataSource?.EndsWith(".db", StringComparison.OrdinalIgnoreCase) == true
            || conn.ConnectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase);
        var isPostgres = conn.GetType().FullName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;

        if (!isSqlite && !isPostgres)
            return;

        await conn.OpenAsync();
        try
        {
            if (isPostgres)
            {
                await EnsurePostgresColumnAsync(conn, "DemoConfigs", "SalesEmail", "TEXT NULL");
                await EnsurePostgresColumnAsync(conn, "DemoConfigs", "SupportEmail", "TEXT NULL");
                await EnsurePostgresColumnAsync(conn, "DemoConfigs", "PrivacyEmail", "TEXT NULL");
                await EnsurePostgresColumnAsync(conn, "DemoConfigs", "LegalEmail", "TEXT NULL");
                await EnsurePostgresColumnAsync(conn, "DemoConfigs", "DpoEmail", "TEXT NULL");
                await EnsurePostgresColumnAsync(conn, "DemoConfigs", "TrustLogosJson", "TEXT NULL");
                return;
            }

            await EnsureColumnAsync(conn, "DemoConfigs", "ChapterPickEnabled", "INTEGER NOT NULL DEFAULT 1");
            await EnsureColumnAsync(conn, "DemoConfigs", "PauseEnabled", "INTEGER NOT NULL DEFAULT 1");
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemePrimaryColor", "TEXT NOT NULL DEFAULT '#5CF8D0'");
            await BackfillThemeColorsAsync(conn);
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemeAccentColor", "TEXT NOT NULL DEFAULT '#4f8a28'");
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemeBackgroundColor", "TEXT NOT NULL DEFAULT '#0f1011'");
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemeSurfaceColor", "TEXT NOT NULL DEFAULT '#1a1b1d'");
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemeTextColor", "TEXT NOT NULL DEFAULT '#e8e8e8'");
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemeFontFamily", "TEXT NOT NULL DEFAULT 'Poppins'");
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemeBrandName", "TEXT NOT NULL DEFAULT 'Demo Studio'");
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemeChatTitle", "TEXT NOT NULL DEFAULT 'Demo Assistant'");
            await EnsureTableAsync(conn, "VideoToasters", """
                CREATE TABLE IF NOT EXISTS "VideoToasters" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_VideoToasters" PRIMARY KEY AUTOINCREMENT,
                    "ChapterId" INTEGER NULL,
                    "TriggerAtSeconds" INTEGER NOT NULL,
                    "DurationSeconds" INTEGER NOT NULL,
                    "Title" TEXT NOT NULL,
                    "Message" TEXT NOT NULL,
                    "IsEnabled" INTEGER NOT NULL,
                    "SortOrder" INTEGER NOT NULL
                );
                """);
            await EnsureColumnAsync(conn, "VideoToasters", "ToasterType", "TEXT NOT NULL DEFAULT 'popup'");
            await EnsureColumnAsync(conn, "VideoToasters", "DownloadUrl", "TEXT NULL");
            await EnsureColumnAsync(conn, "VideoToasters", "DownloadFileName", "TEXT NULL");
            await EnsureColumnAsync(conn, "VideoToasters", "BannerPosition", "TEXT NOT NULL DEFAULT 'top'");
            await EnsureColumnAsync(conn, "VideoToasters", "ImageUrl", "TEXT NULL");
            await EnsureColumnAsync(conn, "VideoToasters", "LinkUrl", "TEXT NULL");
            await EnsureColumnAsync(conn, "VideoToasters", "LinkNewWindow", "INTEGER NOT NULL DEFAULT 0");
            await EnsureColumnAsync(conn, "VideoToasters", "ThumbnailUrl", "TEXT NULL");
            await EnsureTableAsync(conn, "VideoPausePoints", """
                CREATE TABLE IF NOT EXISTS "VideoPausePoints" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_VideoPausePoints" PRIMARY KEY AUTOINCREMENT,
                    "ChapterId" INTEGER NULL,
                    "TriggerAtSeconds" INTEGER NOT NULL,
                    "Prompt" TEXT NOT NULL,
                    "FieldId" TEXT NOT NULL,
                    "InputType" TEXT NOT NULL,
                    "OptionsJson" TEXT NULL,
                    "Required" INTEGER NOT NULL,
                    "Placeholder" TEXT NULL,
                    "IsEnabled" INTEGER NOT NULL,
                    "SortOrder" INTEGER NOT NULL
                );
                """);
            await EnsureTableAsync(conn, "ChapterViewRecords", """
                CREATE TABLE IF NOT EXISTS "ChapterViewRecords" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_ChapterViewRecords" PRIMARY KEY AUTOINCREMENT,
                    "SessionId" TEXT NOT NULL,
                    "ChapterId" INTEGER NOT NULL,
                    "SecondsWatched" INTEGER NOT NULL,
                    "UpdatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_ChapterViewRecords_SessionId_ChapterId",
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_ChapterViewRecords_SessionId_ChapterId" ON "ChapterViewRecords" ("SessionId", "ChapterId");""");
            await EnsureTableAsync(conn, "EngagementEvents", """
                CREATE TABLE IF NOT EXISTS "EngagementEvents" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_EngagementEvents" PRIMARY KEY AUTOINCREMENT,
                    "SessionId" TEXT NOT NULL,
                    "EventType" TEXT NOT NULL,
                    "ChapterId" INTEGER NULL,
                    "ToasterId" INTEGER NULL,
                    "DataJson" TEXT NULL,
                    "CreatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_EngagementEvents_SessionId",
                """CREATE INDEX IF NOT EXISTS "IX_EngagementEvents_SessionId" ON "EngagementEvents" ("SessionId");""");
            await EnsureIndexAsync(conn, "IX_EngagementEvents_CreatedAt",
                """CREATE INDEX IF NOT EXISTS "IX_EngagementEvents_CreatedAt" ON "EngagementEvents" ("CreatedAt");""");
            await EnsureTableAsync(conn, "ScheduledEvents", """
                CREATE TABLE IF NOT EXISTS "ScheduledEvents" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_ScheduledEvents" PRIMARY KEY AUTOINCREMENT,
                    "Slug" TEXT NOT NULL,
                    "Title" TEXT NOT NULL,
                    "StartsAtUtc" TEXT NOT NULL,
                    "HoldingHeading" TEXT NULL,
                    "HoldingMessage" TEXT NULL,
                    "HoldingImageUrl" TEXT NULL,
                    "HoldingVideoUrl" TEXT NULL,
                    "HoldingVideoType" TEXT NOT NULL DEFAULT 'none',
                    "DefaultChapterId" INTEGER NULL,
                    "IsEnabled" INTEGER NOT NULL,
                    "UpdatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_ScheduledEvents_Slug",
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_ScheduledEvents_Slug" ON "ScheduledEvents" ("Slug");""");

            await EnsureColumnAsync(conn, "FlowProjects", "Slug", "TEXT NOT NULL DEFAULT 'default'");
            await EnsureColumnAsync(conn, "FlowProjects", "IsEnabled", "INTEGER NOT NULL DEFAULT 1");
            await EnsureColumnAsync(conn, "FlowProjects", "CreatedAt", "TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z'");
            await EnsureIndexAsync(conn, "IX_FlowProjects_Slug",
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_FlowProjects_Slug" ON "FlowProjects" ("Slug");""");
            await BackfillFlowSlugsAsync(conn);

            await EnsureColumnAsync(conn, "ScheduledEvents", "FlowSlug", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "RecurrenceType", "TEXT NOT NULL DEFAULT 'none'");
            await EnsureColumnAsync(conn, "ScheduledEvents", "IntervalMinutes", "INTEGER NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "RecurrenceStartUtc", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "RecurrenceEndUtc", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "Timezone", "TEXT NOT NULL DEFAULT 'UTC'");
            await EnsureColumnAsync(conn, "ScheduledEvents", "WeeklyScheduleJson", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "LiveDurationMinutes", "INTEGER NULL");
            await BackfillEventFlowSlugsAsync(conn);

            await EnsureColumnAsync(conn, "Chapters", "ShowDuration", "INTEGER NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "ThemeLogoUrl", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "SlackEnabled", "INTEGER NOT NULL DEFAULT 0");
            await EnsureColumnAsync(conn, "DemoConfigs", "SlackChannelId", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "TeamsEnabled", "INTEGER NOT NULL DEFAULT 0");
            await EnsureColumnAsync(conn, "DemoConfigs", "TeamsServiceUrl", "TEXT NULL");
            await EnsureColumnAsync(conn, "ChatMessages", "Source", "TEXT NOT NULL DEFAULT 'demo'");
            await EnsureColumnAsync(conn, "ChatMessages", "ExternalId", "TEXT NULL");
            await EnsureTableAsync(conn, "ChatSessionMappings", """
                CREATE TABLE IF NOT EXISTS "ChatSessionMappings" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_ChatSessionMappings" PRIMARY KEY AUTOINCREMENT,
                    "SessionId" TEXT NOT NULL,
                    "SlackChannelId" TEXT NULL,
                    "SlackThreadTs" TEXT NULL,
                    "TeamsConversationId" TEXT NULL,
                    "TeamsServiceUrl" TEXT NULL,
                    "CreatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_ChatSessionMappings_SessionId",
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_ChatSessionMappings_SessionId" ON "ChatSessionMappings" ("SessionId");""");

            await EnsureColumnAsync(conn, "Chapters", "FlowProjectId", "INTEGER NULL");
            await EnsureColumnAsync(conn, "VideoToasters", "FlowProjectId", "INTEGER NULL");
            await EnsureColumnAsync(conn, "VideoPausePoints", "FlowProjectId", "INTEGER NULL");
            await EnsureColumnAsync(conn, "SeedChatMessages", "FlowProjectId", "INTEGER NULL");
            await EnsureColumnAsync(conn, "ChatMessages", "FlowSlug", "TEXT NULL");
            await EnsureColumnAsync(conn, "EngagementEvents", "FlowSlug", "TEXT NULL");
            await BackfillFlowProjectIdsAsync(conn);
            await EnsureIndexAsync(conn, "IX_Chapters_FlowProjectId_Slug",
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_Chapters_FlowProjectId_Slug" ON "Chapters" ("FlowProjectId", "Slug");""");
            await EnsureIndexAsync(conn, "IX_VideoToasters_FlowProjectId",
                """CREATE INDEX IF NOT EXISTS "IX_VideoToasters_FlowProjectId" ON "VideoToasters" ("FlowProjectId");""");
            await EnsureIndexAsync(conn, "IX_VideoPausePoints_FlowProjectId",
                """CREATE INDEX IF NOT EXISTS "IX_VideoPausePoints_FlowProjectId" ON "VideoPausePoints" ("FlowProjectId");""");
            await EnsureIndexAsync(conn, "IX_SeedChatMessages_FlowProjectId",
                """CREATE INDEX IF NOT EXISTS "IX_SeedChatMessages_FlowProjectId" ON "SeedChatMessages" ("FlowProjectId");""");
            await EnsureIndexAsync(conn, "IX_EngagementEvents_FlowSlug",
                """CREATE INDEX IF NOT EXISTS "IX_EngagementEvents_FlowSlug" ON "EngagementEvents" ("FlowSlug");""");
            await EnsureIndexAsync(conn, "IX_ChatMessages_FlowSlug",
                """CREATE INDEX IF NOT EXISTS "IX_ChatMessages_FlowSlug" ON "ChatMessages" ("FlowSlug");""");

            await EnsureTableAsync(conn, "LeadSubmissions", """
                CREATE TABLE IF NOT EXISTS "LeadSubmissions" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_LeadSubmissions" PRIMARY KEY AUTOINCREMENT,
                    "SessionId" TEXT NOT NULL,
                    "FlowSlug" TEXT NOT NULL,
                    "Source" TEXT NOT NULL,
                    "ChapterId" INTEGER NULL,
                    "NodeId" TEXT NULL,
                    "AnswersJson" TEXT NOT NULL,
                    "CreatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_LeadSubmissions_FlowSlug",
                """CREATE INDEX IF NOT EXISTS "IX_LeadSubmissions_FlowSlug" ON "LeadSubmissions" ("FlowSlug");""");

            await EnsureColumnAsync(conn, "DemoConfigs", "LeadWebhookUrl", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "LeadNotifyEmail", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "DemoChatSubtitle", "TEXT NULL");
            await EnsureColumnAsync(conn, "AdminUsers", "MustChangePassword", "INTEGER NOT NULL DEFAULT 1");

            await EnsureTableAsync(conn, "ChapterVideos", """
                CREATE TABLE IF NOT EXISTS "ChapterVideos" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_ChapterVideos" PRIMARY KEY AUTOINCREMENT,
                    "ChapterId" INTEGER NOT NULL,
                    "Title" TEXT NOT NULL,
                    "VideoLink" TEXT NOT NULL,
                    "Duration" TEXT NOT NULL,
                    "SortOrder" INTEGER NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_ChapterVideos_ChapterId",
                """CREATE INDEX IF NOT EXISTS "IX_ChapterVideos_ChapterId" ON "ChapterVideos" ("ChapterId");""");
            await BackfillChapterVideosAsync(conn);

            // Events platform extensions
            await EnsureColumnAsync(conn, "ScheduledEvents", "EventKind", "TEXT NOT NULL DEFAULT 'scheduled'");
            await EnsureColumnAsync(conn, "ScheduledEvents", "AccessMode", "TEXT NOT NULL DEFAULT 'open'");
            await EnsureColumnAsync(conn, "ScheduledEvents", "RegistrationFormJson", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "RegistrationApprovalMode", "TEXT NOT NULL DEFAULT 'auto'");
            await EnsureColumnAsync(conn, "ScheduledEvents", "CrmListKey", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "AttendeeWebhookSecret", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "PrivacyPolicyOverrideJson", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "AccessOverrideJson", "TEXT NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "DuplicatedFromId", "INTEGER NULL");
            await EnsureColumnAsync(conn, "ScheduledEvents", "OnDemandLiveStartUtc", "TEXT NULL");

            await EnsureColumnAsync(conn, "DemoConfigs", "AttendeeWebhookUrl", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "BlockedEmailDomainsJson", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "SalesEmail", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "SupportEmail", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "PrivacyEmail", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "LegalEmail", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "DpoEmail", "TEXT NULL");
            await EnsureColumnAsync(conn, "DemoConfigs", "TrustLogosJson", "TEXT NULL");

            await EnsureTableAsync(conn, "EventAttendees", """
                CREATE TABLE IF NOT EXISTS "EventAttendees" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_EventAttendees" PRIMARY KEY AUTOINCREMENT,
                    "EventId" INTEGER NOT NULL,
                    "Email" TEXT NOT NULL,
                    "Name" TEXT NULL,
                    "Status" TEXT NOT NULL DEFAULT 'pending',
                    "Source" TEXT NOT NULL DEFAULT 'manual',
                    "RejectedReason" TEXT NULL,
                    "AnswersJson" TEXT NULL,
                    "ConsentRegion" TEXT NULL,
                    "ConsentGivenAt" TEXT NULL,
                    "ConsentNoticeVersion" TEXT NULL,
                    "CreatedAt" TEXT NOT NULL,
                    "UpdatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_EventAttendees_EventId_Email",
                """CREATE INDEX IF NOT EXISTS "IX_EventAttendees_EventId_Email" ON "EventAttendees" ("EventId", "Email");""");

            await EnsureTableAsync(conn, "GlobalAccessListEntries", """
                CREATE TABLE IF NOT EXISTS "GlobalAccessListEntries" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_GlobalAccessListEntries" PRIMARY KEY AUTOINCREMENT,
                    "ListType" TEXT NOT NULL DEFAULT 'blacklist',
                    "MatchType" TEXT NOT NULL DEFAULT 'email',
                    "Value" TEXT NOT NULL,
                    "Note" TEXT NULL,
                    "CreatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_GlobalAccessListEntries_ListType_MatchType_Value",
                """CREATE INDEX IF NOT EXISTS "IX_GlobalAccessListEntries_ListType_MatchType_Value" ON "GlobalAccessListEntries" ("ListType", "MatchType", "Value");""");

            await EnsureTableAsync(conn, "PrivacyPolicyRegions", """
                CREATE TABLE IF NOT EXISTS "PrivacyPolicyRegions" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_PrivacyPolicyRegions" PRIMARY KEY AUTOINCREMENT,
                    "RegionCode" TEXT NOT NULL,
                    "NoticeHtml" TEXT NOT NULL DEFAULT '',
                    "ConsentRequired" INTEGER NOT NULL DEFAULT 0,
                    "PolicyUrl" TEXT NULL,
                    "UpdatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_PrivacyPolicyRegions_RegionCode",
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_PrivacyPolicyRegions_RegionCode" ON "PrivacyPolicyRegions" ("RegionCode");""");

            await EnsureTableAsync(conn, "EventSessionLinks", """
                CREATE TABLE IF NOT EXISTS "EventSessionLinks" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_EventSessionLinks" PRIMARY KEY AUTOINCREMENT,
                    "SessionId" TEXT NOT NULL,
                    "EventSlug" TEXT NOT NULL,
                    "EventOccurrenceStartUtc" TEXT NULL,
                    "RegisteredAttendeeId" INTEGER NULL,
                    "ViewerEmail" TEXT NULL,
                    "CreatedAt" TEXT NOT NULL,
                    "UpdatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_EventSessionLinks_SessionId_EventSlug",
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_EventSessionLinks_SessionId_EventSlug" ON "EventSessionLinks" ("SessionId", "EventSlug");""");

            await EnsureTableAsync(conn, "EventOccurrenceLogs", """
                CREATE TABLE IF NOT EXISTS "EventOccurrenceLogs" (
                    "Id" INTEGER NOT NULL CONSTRAINT "PK_EventOccurrenceLogs" PRIMARY KEY AUTOINCREMENT,
                    "EventId" INTEGER NOT NULL,
                    "OccurrenceStartUtc" TEXT NOT NULL,
                    "OccurrenceEndUtc" TEXT NULL,
                    "TriggerSource" TEXT NOT NULL DEFAULT 'scheduled',
                    "CreatedAt" TEXT NOT NULL
                );
                """);
            await EnsureIndexAsync(conn, "IX_EventOccurrenceLogs_EventId",
                """CREATE INDEX IF NOT EXISTS "IX_EventOccurrenceLogs_EventId" ON "EventOccurrenceLogs" ("EventId");""");

            await SeedDefaultPrivacyRegionsAsync(conn);
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    private static async Task EnsurePostgresColumnAsync(System.Data.Common.DbConnection conn, string table, string column, string definition)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{column}" {definition}""";
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task EnsureColumnAsync(System.Data.Common.DbConnection conn, string table, string column, string definition)
    {
        var hasCol = false;
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = $"PRAGMA table_info({table})";
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                if (reader.GetString(1) == column) { hasCol = true; break; }
            }
        }
        if (!hasCol)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {definition}";
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static async Task EnsureTableAsync(System.Data.Common.DbConnection conn, string table, string createSql)
    {
        await using var check = conn.CreateCommand();
        check.CommandText = $"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'";
        var exists = await check.ExecuteScalarAsync();
        if (exists == null)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = createSql;
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static async Task EnsureIndexAsync(System.Data.Common.DbConnection conn, string indexName, string createSql)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = createSql;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task BackfillThemeColorsAsync(System.Data.Common.DbConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE "DemoConfigs" SET "ThemePrimaryColor" = '#5CF8D0'
            WHERE lower("ThemePrimaryColor") IN ('#77c043', '#55e6c1');
            UPDATE "DemoConfigs" SET "ThemeAccentColor" = '#47dcb0'
            WHERE lower("ThemeAccentColor") IN ('#4f8a28', '#6c5ce7');
            """;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task BackfillFlowSlugsAsync(System.Data.Common.DbConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE "FlowProjects" SET "Slug" = 'default' WHERE "Slug" IS NULL OR "Slug" = '';
            UPDATE "FlowProjects" SET "IsEnabled" = 1 WHERE "IsEnabled" IS NULL;
            """;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task BackfillEventFlowSlugsAsync(System.Data.Common.DbConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE "ScheduledEvents" SET "FlowSlug" = 'default' WHERE "FlowSlug" IS NULL OR "FlowSlug" = '';
            UPDATE "ScheduledEvents" SET "RecurrenceType" = 'none' WHERE "RecurrenceType" IS NULL OR "RecurrenceType" = '';
            UPDATE "ScheduledEvents" SET "Timezone" = 'UTC' WHERE "Timezone" IS NULL OR "Timezone" = '';
            """;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task BackfillFlowProjectIdsAsync(System.Data.Common.DbConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE "Chapters" SET "FlowProjectId" = 1 WHERE "FlowProjectId" IS NULL;
            UPDATE "VideoToasters" SET "FlowProjectId" = 1 WHERE "FlowProjectId" IS NULL;
            UPDATE "VideoPausePoints" SET "FlowProjectId" = 1 WHERE "FlowProjectId" IS NULL;
            UPDATE "SeedChatMessages" SET "FlowProjectId" = 1 WHERE "FlowProjectId" IS NULL;
            UPDATE "ChatMessages" SET "FlowSlug" = 'default' WHERE "FlowSlug" IS NULL OR "FlowSlug" = '';
            UPDATE "EngagementEvents" SET "FlowSlug" = 'default' WHERE "FlowSlug" IS NULL OR "FlowSlug" = '';
            """;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task BackfillChapterVideosAsync(System.Data.Common.DbConnection conn)
    {
        await using var check = conn.CreateCommand();
        check.CommandText = """SELECT COUNT(*) FROM "ChapterVideos";""";
        var count = Convert.ToInt32(await check.ExecuteScalarAsync());
        if (count > 0) return;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO "ChapterVideos" ("ChapterId", "Title", "VideoLink", "Duration", "SortOrder")
            SELECT c."Id", c."Name", c."VideoLink", c."Duration", 1
            FROM "Chapters" c
            WHERE c."VideoLink" IS NOT NULL AND c."VideoLink" != '';
            """;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task SeedDefaultPrivacyRegionsAsync(System.Data.Common.DbConnection conn)
    {
        await using var check = conn.CreateCommand();
        check.CommandText = """SELECT COUNT(*) FROM "PrivacyPolicyRegions";""";
        var count = Convert.ToInt32(await check.ExecuteScalarAsync());
        if (count > 0) return;

        var now = DateTime.UtcNow.ToString("o");
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            INSERT INTO "PrivacyPolicyRegions" ("RegionCode", "NoticeHtml", "ConsentRequired", "PolicyUrl", "UpdatedAt") VALUES
            ('DEFAULT', 'By submitting this form you agree to our privacy policy and consent to us storing your information for event access.', 0, NULL, '{now}'),
            ('EU', 'Under GDPR we need your explicit consent to process your personal data for this event. You may withdraw consent at any time.', 1, NULL, '{now}'),
            ('UK', 'Under UK GDPR we need your explicit consent to process your personal data for this event. You may withdraw consent at any time.', 1, NULL, '{now}'),
            ('US', 'By submitting this form you agree to our privacy policy. Your information will be used to manage event access.', 0, NULL, '{now}');
            """;
        await cmd.ExecuteNonQueryAsync();
    }
}
