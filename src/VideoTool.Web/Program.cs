using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using VideoTool.Data;
using VideoTool.Data.Migrations;
using VideoTool.Data.Seeders;
using VideoTool.Web.Hubs;
using VideoTool.Web.Services;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var connectionString = ResolveConnectionString(builder.Configuration);

builder.Services.AddDbContext<VideoToolDbContext>(options =>
{
    if (connectionString.StartsWith("Host=", StringComparison.OrdinalIgnoreCase) ||
        connectionString.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
        options.UseNpgsql(connectionString);
    else
        options.UseSqlite(connectionString);
});

builder.Services.AddHttpClient();
builder.Services.AddSingleton<AiChatService>();
builder.Services.AddSingleton<RecurrenceService>();
builder.Services.AddSingleton<SlackIntegrationService>();
builder.Services.AddSingleton<TeamsIntegrationService>();
builder.Services.AddScoped<ChatMessageService>();
builder.Services.AddScoped<LeadNotificationService>();
builder.Services.AddScoped<EventAccessService>();
builder.Services.AddScoped<EventSessionService>();
builder.Services.AddScoped<EventAnalyticsService>();
builder.Services.AddScoped<AttendeeImportService>();
builder.Services.AddScoped<PrivacyPolicyService>();
builder.Services.AddSingleton<ICrmAttendeeProvider, NoOpCrmAttendeeProvider>();
builder.Services.AddSignalR();
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "videotool.auth";
        options.LoginPath = "/admin/login";
        options.Events.OnRedirectToLogin = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = 401;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyHeader().AllowAnyMethod().AllowCredentials().SetIsOriginAllowed(_ => true));
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<VideoToolDbContext>();
    await SchemaMigrator.ApplyAsync(db);
    var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "admin123";
    await DatabaseSeeder.SeedAsync(db, adminPassword);
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.MapFallbackToFile("index.html");

app.Run();

static string ResolveConnectionString(IConfiguration config)
{
    var dbUrl = (Environment.GetEnvironmentVariable("DATABASE_URL") ?? "").Trim();
    var pgHost = (Environment.GetEnvironmentVariable("PGHOST") ?? "").Trim();
    var pgUser = (Environment.GetEnvironmentVariable("PGUSER") ?? "").Trim();

    if (!string.IsNullOrEmpty(pgHost) && !string.IsNullOrEmpty(pgUser))
    {
        var pgPort = Environment.GetEnvironmentVariable("PGPORT") ?? "5432";
        var pgPass = Environment.GetEnvironmentVariable("PGPASSWORD") ?? "";
        var pgDb = Environment.GetEnvironmentVariable("PGDATABASE") ?? "railway";
        var csb = new Npgsql.NpgsqlConnectionStringBuilder
        {
            Host = pgHost,
            Port = int.TryParse(pgPort, out var p) ? p : 5432,
            Username = pgUser,
            Password = pgPass,
            Database = pgDb,
            SslMode = Npgsql.SslMode.Require
        };
        return csb.ConnectionString;
    }

    if (dbUrl.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
    {
        try { return new Npgsql.NpgsqlConnectionStringBuilder(dbUrl).ConnectionString; }
        catch { /* fall through */ }
    }

    return config.GetConnectionString("DefaultConnection") ?? "Data Source=videotool.db";
}
