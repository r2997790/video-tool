using System.Text;
using System.Text.Json;

namespace VideoTool.Web.Services;

public class TeamsIntegrationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TeamsIntegrationService> _logger;
    private string? _cachedToken;
    private DateTime _tokenExpiresAt = DateTime.MinValue;

    public TeamsIntegrationService(IHttpClientFactory httpClientFactory, ILogger<TeamsIntegrationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public static bool IsConfigured =>
        !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("MICROSOFT_APP_ID")) &&
        !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("MICROSOFT_APP_PASSWORD"));

    public async Task SendMessageAsync(string serviceUrl, string conversationId, string text)
    {
        var token = await GetBotTokenAsync();
        if (token == null) return;

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var activity = new
        {
            type = "message",
            text
        };

        var url = $"{serviceUrl.TrimEnd('/')}/v3/conversations/{conversationId}/activities";
        var response = await client.PostAsync(
            url,
            new StringContent(JsonSerializer.Serialize(activity), Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Teams send failed ({Status}): {Body}", response.StatusCode, body);
        }
    }

    public async Task<string?> GetBotTokenAsync()
    {
        if (_cachedToken != null && DateTime.UtcNow < _tokenExpiresAt)
            return _cachedToken;

        var appId = Environment.GetEnvironmentVariable("MICROSOFT_APP_ID");
        var appPassword = Environment.GetEnvironmentVariable("MICROSOFT_APP_PASSWORD");
        if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(appPassword)) return null;

        var client = _httpClientFactory.CreateClient();
        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = appId,
            ["client_secret"] = appPassword,
            ["scope"] = "https://api.botframework.com/.default"
        });

        var response = await client.PostAsync(
            "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token",
            form);

        var json = await response.Content.ReadAsStringAsync();
        try
        {
            using var doc = JsonDocument.Parse(json);
            _cachedToken = doc.RootElement.GetProperty("access_token").GetString();
            var expiresIn = doc.RootElement.GetProperty("expires_in").GetInt32();
            _tokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn - 60);
            return _cachedToken;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to obtain Teams bot token");
            return null;
        }
    }
}
