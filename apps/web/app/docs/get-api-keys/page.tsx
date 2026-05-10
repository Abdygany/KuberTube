export default function GetApiKeysPage() {
  return (
    <>
      <h1>Getting your API keys</h1>
      <p>
        Learnspace requires two API keys to function: one for YouTube search and one for Brave web
        search. Both have generous free tiers sufficient for personal use.
      </p>

      <h2>YouTube Data API v3</h2>
      <p>Free. Quota: 10,000 units/day — each search query uses ~100 units.</p>
      <ol>
        <li>
          Go to the{' '}
          <strong>Google Cloud Console</strong> and create a new project (or use an existing one).
        </li>
        <li>
          Navigate to <strong>APIs &amp; Services → Library</strong>.
        </li>
        <li>
          Search for <strong>"YouTube Data API v3"</strong> and click <strong>Enable</strong>.
        </li>
        <li>
          Go to <strong>APIs &amp; Services → Credentials</strong>.
        </li>
        <li>
          Click <strong>Create Credentials → API Key</strong>. Copy the key.
        </li>
        <li>
          (Recommended) Click <strong>Edit API Key</strong> and restrict it to{' '}
          <em>YouTube Data API v3</em> and your server&rsquo;s IP address.
        </li>
        <li>
          Paste the key into <strong>Settings → API Keys → YouTube Data API v3</strong> in
          Learnspace.
        </li>
      </ol>

      <h2>Brave Search API</h2>
      <p>
        Free tier: 2,000 queries/month. Paid: $3 per 1,000 queries. Most users stay within the free
        tier.
      </p>
      <ol>
        <li>
          Go to <strong>api.search.brave.com</strong> and create an account.
        </li>
        <li>
          Choose the <strong>Free</strong> plan (or a paid plan for higher volume).
        </li>
        <li>
          Navigate to <strong>API Keys</strong> in your dashboard and create a new key.
        </li>
        <li>
          Copy the subscription token and paste it into{' '}
          <strong>Settings → API Keys → Brave Search API</strong> in Learnspace.
        </li>
      </ol>

      <h2>Anthropic API (optional)</h2>
      <p>
        Required only for AI summaries, which are a post-MVP feature. You do not need this key to
        use Learnspace now.
      </p>
      <ol>
        <li>
          Go to <strong>console.anthropic.com</strong> and create an account.
        </li>
        <li>Navigate to <strong>API Keys</strong> and create a key.</li>
        <li>
          Paste it into <strong>Settings → API Keys → Anthropic API</strong>.
        </li>
      </ol>

      <h2>Verifying your keys</h2>
      <p>
        After adding a key, click the <strong>Test</strong> button next to it in Settings. Learnspace
        makes a minimal test request to verify the key is valid and marks it accordingly.
      </p>
    </>
  );
}
