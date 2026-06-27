using Microsoft.Extensions.Options;

namespace VideoTool.Web.Services;

public class ConfigureStripeOptionsFromEnv : IConfigureOptions<StripeOptions>
{
    public void Configure(StripeOptions options)
    {
        options.SecretKey = EnvOr(options.SecretKey, "STRIPE_SECRET_KEY");
        options.PublishableKey = EnvOr(options.PublishableKey, "STRIPE_PUBLISHABLE_KEY");
        options.WebhookSecret = EnvOr(options.WebhookSecret, "STRIPE_WEBHOOK_SECRET");
        options.PriceStarter = EnvOr(options.PriceStarter, "STRIPE_PRICE_STARTER");
        options.PricePro = EnvOr(options.PricePro, "STRIPE_PRICE_PRO");
    }

    static string EnvOr(string current, string envVar)
    {
        var fromEnv = Environment.GetEnvironmentVariable(envVar);
        return string.IsNullOrWhiteSpace(fromEnv) ? current : fromEnv;
    }
}
