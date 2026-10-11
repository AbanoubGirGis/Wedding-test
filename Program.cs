using System.Text.Json;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = "pages"
});
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(4);
    options.Cookie.Name = "wishes-gate";
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

var app = builder.Build();
var wishesPath = Path.Combine(app.Environment.ContentRootPath, "data", "wishes.json");
var wishesGate = new SemaphoreSlim(1, 1);

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseSession();

app.MapPost("/api/wishes", (HttpRequest request) => WishBook.SaveAsync(request, wishesPath, wishesGate))
    .DisableAntiforgery();

app.MapGet("/board", () => Results.Content(WishPages.Shell(), "text/html; charset=utf-8"));

app.MapGet("/api/board", async (HttpContext context) =>
{
    if (!Open(context)) return Results.Json(new { ok = false }, statusCode: StatusCodes.Status401Unauthorized);
    var wishes = await WishBook.ReadAsync(wishesPath, wishesGate);
    return Results.Json(new { ok = true, notes = WishBook.Notes(wishes) });
});

app.MapPost("/api/board", async (HttpContext context) =>
{
    BoardInput? input;
    try
    {
        input = await context.Request.ReadFromJsonAsync<BoardInput>();
    }
    catch (JsonException)
    {
        return Results.Json(new { ok = false }, statusCode: StatusCodes.Status401Unauthorized);
    }

    var expected = app.Configuration["Wishes:Password"];
    if (!WishBook.PasswordMatches(input?.Password ?? "", expected))
        return Results.Json(new { ok = false }, statusCode: StatusCodes.Status401Unauthorized);

    context.Session.SetString("wishes", "open");
    var wishes = await WishBook.ReadAsync(wishesPath, wishesGate);
    return Results.Json(new { ok = true, notes = WishBook.Notes(wishes) });
}).DisableAntiforgery();

app.MapFallbackToFile("index.html");
app.Run();

static bool Open(HttpContext context) => context.Session.GetString("wishes") == "open";
