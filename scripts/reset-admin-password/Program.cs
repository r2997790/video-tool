using Microsoft.EntityFrameworkCore;
using VideoTool.Data;

var password = args.Length > 0 ? args[0] : "kermit";
var username = args.Length > 1 ? args[1] : "admin";

var builder = new DbContextOptionsBuilder<VideoToolDbContext>();
var connectionString = ResolveConnectionString(args.ElementAtOrDefault(2));
if (connectionString.StartsWith("Host=", StringComparison.OrdinalIgnoreCase) ||
    connectionString.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
    builder.UseNpgsql(connectionString);
else
{
    if (!File.Exists(connectionString))
    {
        Console.Error.WriteLine($"Database not found: {connectionString}");
        return 1;
    }
    builder.UseSqlite($"Data Source={connectionString}");
}

await using var db = new VideoToolDbContext(builder.Options);
var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Username == username);
if (user == null)
{
    Console.Error.WriteLine($"User '{username}' not found.");
    return 1;
}

user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
user.MustChangePassword = false;
await db.SaveChangesAsync();

Console.WriteLine($"Password for '{username}' reset successfully.");
return 0;

static string ResolveConnectionString(string? overridePath)
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

    if (!string.IsNullOrWhiteSpace(overridePath))
        return overridePath;

    return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "src", "VideoTool.Web", "videotool.db"));
}
