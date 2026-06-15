using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace VideoTool.Web.Services;

public class SlackIntegrationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SlackIntegrationService> _logger;

    public SlackIntegrationService(IHttpClientFactory httpClientFactory, ILogger<SlackIntegrationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public static bool IsConfigured =>
        !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("SLACK_BOT_TOKEN")) &&
        !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("SLACK_SIGNING_SECRET"));

    public bool VerifySignature(string signature, string timestamp, string body)
    {
        var secret = Environment.GetEnvironmentVariable("SLACK_SIGNING_SECRET");
        if (string.IsNullOrEmpty(secret) || string.IsNullOrEmpty(signature)) return false;

        var baseString = $"v0:{timestamp}:{body}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(baseString));
        var computed = "v0=" + Convert.ToHexString(hash).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computed),
            Encoding.UTF8.GetBytes(signature));
    }

    public async Task<string?> CreateThreadAsync(string channelId, string rootText, string firstReply)
    {
        var ts = await PostMessageAsync(channelId, rootText, threadTs: null);
        if (ts == null) return null;
        await PostMessageAsync(channelId, firstReply, ts);
        return ts;
    }

    public Task PostThreadReplyAsync(string channelId, string threadTs, string text) =>
        PostMessageAsync(channelId, text, threadTs)!;

    private async Task<string?> PostMessageAsync(string channelId, string text, string? threadTs)
    {
        var token = Environment.GetEnvironmentVariable("SLACK_BOT_TOKEN");
        if (string.IsNullOrEmpty(token)) return null;

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var payload = new Dictionary<string, object>
        {
            ["channel"] = channelId,
            ["text"] = text
        };
        if (threadTs != null) payload["thread_ts"] = threadTs;

        var response = await client.PostAsync(
            "https://slack.com/api/chat.postMessage",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        var json = await response.Content.ReadAsStringAsync();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.GetProperty("ok").GetBoolean())
            {
                _logger.LogWarning("Slack API error: {Response}", json);
                return null;
            }
            if (threadTs != null) return threadTs;
            return doc.RootElement.GetProperty("ts").GetString();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Slack response: {Response}", json);
            return null;
        }
    }
}
