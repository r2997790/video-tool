namespace VideoTool.Web.Services;

public class StripeOptions
{
    public string SecretKey { get; set; } = "";
    public string PublishableKey { get; set; } = "";
    public string WebhookSecret { get; set; } = "";
    public string PriceStarter { get; set; } = "";
    public string PricePro { get; set; } = "";
}
