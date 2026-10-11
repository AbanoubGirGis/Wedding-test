using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

static class WishBook
{
    static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    public static async Task<IResult> SaveAsync(HttpRequest request, string path, SemaphoreSlim gate)
    {
        WishInput? input;
        try
        {
            input = await request.ReadFromJsonAsync<WishInput>();
        }
        catch (JsonException)
        {
            return Results.BadRequest(new { ok = false });
        }

        var name = (input?.Name ?? "").Trim();
        var to = (input?.To ?? "").Trim();
        var message = (input?.Message ?? "").Trim();
        var validTo = to is "groom" or "bride" or "both";

        if (input?.Attending is not bool attending || name.Length is 0 or > 80 || !validTo || message.Length > 2000)
            return Results.BadRequest(new { ok = false });

        var entry = new WishEntry
        {
            At = DateTimeOffset.Now,
            Name = name,
            To = to,
            Message = message,
            Attending = attending
        };

        await gate.WaitAsync();
        try
        {
            var list = await ReadCoreAsync(path);
            list.Add(entry);
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var temp = path + ".tmp";
            await File.WriteAllTextAsync(temp, JsonSerializer.Serialize(list, JsonOptions));
            File.Move(temp, path, overwrite: true);
        }
        finally
        {
            gate.Release();
        }

        return Results.Json(new { ok = true });
    }

    public static object Notes(IEnumerable<WishEntry> wishes) => wishes
        .OrderByDescending(item => item.At)
        .Select(item => new { item.At, item.Name, item.To, item.Message, item.Attending });

    public static async Task<List<WishEntry>> ReadAsync(string path, SemaphoreSlim gate)
    {
        await gate.WaitAsync();
        try
        {
            return await ReadCoreAsync(path);
        }
        finally
        {
            gate.Release();
        }
    }

    public static bool PasswordMatches(string provided, string? expected)
    {
        if (string.IsNullOrEmpty(expected)) return false;
        var actual = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
        var required = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(actual, required);
    }

    static async Task<List<WishEntry>> ReadCoreAsync(string path)
    {
        if (!File.Exists(path)) return [];
        await using var stream = File.OpenRead(path);
        if (stream.Length == 0) return [];
        return await JsonSerializer.DeserializeAsync<List<WishEntry>>(stream, JsonOptions) ?? [];
    }
}

sealed class WishEntry
{
    public DateTimeOffset At { get; set; }
    public string Name { get; set; } = "";
    public string To { get; set; } = "";
    public string Message { get; set; } = "";
    public bool Attending { get; set; }
}

sealed class WishInput
{
    public string? Name { get; set; }
    public string? To { get; set; }
    public string? Message { get; set; }
    public bool? Attending { get; set; }
}

sealed class BoardInput
{
    public string? Password { get; set; }
}
