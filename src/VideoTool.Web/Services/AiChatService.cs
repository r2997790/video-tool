using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace VideoTool.Web.Services;

public class AiChatService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<AiChatService> _logger;

    private static readonly string[] Fallbacks =
    [
        "Empauer's tools give organisations a complete, evidence-based view of their sustainability and operational data.",
        "Direct maps material flows and quantifies the true cost of waste — giving your team the evidence it needs for confident decisions.",
        "Venta helps organisations manage packaging specifications, compliance and product data in one structured system.",
        "Empauer works with agribusiness, FMCG, logistics and retail organisations across Australia and internationally."
    ];

    public AiChatService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<AiChatService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public async Task<string> GetReplyAsync(string systemPrompt, string userMessage, string? chapterContext, CancellationToken ct = default)
    {
        var apiKey = _config["OPENAI_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return Fallbacks[Random.Shared.Next(Fallbacks.Length)];

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var context = string.IsNullOrWhiteSpace(chapterContext) ? "" : $"\nThe user is currently watching: {chapterContext}";
            var body = new
            {
                model = _config["OPENAI_MODEL"] ?? "gpt-4o-mini",
                messages = new object[]
                {
                    new { role = "system", content = systemPrompt + context },
                    new { role = "user", content = userMessage }
                },
                max_tokens = 300
            };

            var json = JsonSerializer.Serialize(body);
            var response = await client.PostAsync(
                "https://api.openai.com/v1/chat/completions",
                new StringContent(json, Encoding.UTF8, "application/json"),
                ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenAI API returned {Status}", response.StatusCode);
                return Fallbacks[Random.Shared.Next(Fallbacks.Length)];
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? Fallbacks[0];
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI chat failed");
            return "Sorry, I'm unable to respond right now. Please try again shortly.";
        }
    }
}
