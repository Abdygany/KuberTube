export default function DocsPage() {
  return (
    <>
      <h1>Learnspace Documentation</h1>
      <p>
        Learnspace is an open-source, self-hostable learning workspace. This documentation covers
        getting started, obtaining the required API keys, and running your own instance.
      </p>
      <h2>Prerequisites</h2>
      <ul>
        <li>A Google account (for YouTube Data API v3)</li>
        <li>A Brave Search API account</li>
        <li>A Learnspace account (or a self-hosted instance)</li>
      </ul>
      <h2>Quick start</h2>
      <ol>
        <li>
          <a href="/sign-up">Create your Learnspace account</a>.
        </li>
        <li>
          Follow the <a href="/docs/get-api-keys">API keys guide</a> to get your YouTube and Brave
          keys.
        </li>
        <li>
          Go to <strong>Settings → API Keys</strong> and add both keys.
        </li>
        <li>Create your first workspace and start learning.</li>
      </ol>
      <h2>Navigation</h2>
      <ul>
        <li>
          <a href="/docs/get-api-keys">Get API keys</a> — step-by-step instructions for YouTube
          and Brave Search API keys.
        </li>
        <li>
          <a href="/docs/self-host">Self-host</a> — run Learnspace on your own server with Docker
          Compose.
        </li>
        <li>
          <a href="/docs/faq">FAQ</a> — common questions and answers.
        </li>
      </ul>
    </>
  );
}
