export default function SelfHostPage() {
  return (
    <>
      <h1>Self-hosting Learnspace</h1>
      <p>
        Learnspace is fully self-hostable. You need Docker and Docker Compose installed on your
        server.
      </p>

      <h2>1. Clone the repository</h2>
      <pre><code>git clone https://github.com/your-org/learnspace.git
cd learnspace</code></pre>

      <h2>2. Create environment files</h2>
      <pre><code>cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env</code></pre>
      <p>Edit each file and fill in the required values:</p>
      <ul>
        <li>
          <code>BETTER_AUTH_SECRET</code> — generate with{' '}
          <code>openssl rand -base64 32</code>
        </li>
        <li>
          <code>ENCRYPTION_KEY</code> — generate with <code>openssl rand -hex 32</code> (must be
          64 hex characters)
        </li>
        <li>
          <code>DATABASE_URL</code> — PostgreSQL connection string
        </li>
        <li>
          <code>BETTER_AUTH_URL</code> — your API URL (e.g.{' '}
          <code>https://api.yourdomain.com</code>)
        </li>
        <li>
          <code>NEXT_PUBLIC_API_URL</code> — same as above, accessible from the browser
        </li>
      </ul>

      <h2>3. Start with Docker Compose</h2>
      <pre><code>{`docker compose up -d`}</code></pre>
      <p>
        This starts a PostgreSQL 16 database. Then run the database migrations:
      </p>
      <pre><code>pnpm install
pnpm db:push</code></pre>

      <h2>4. Deploy the applications</h2>
      <p>
        <strong>API (Hono backend):</strong> Build and run the Docker image from{' '}
        <code>apps/api/Dockerfile</code>, or deploy to Railway directly from the repository.
      </p>
      <p>
        <strong>Web (Next.js frontend):</strong> Deploy to Vercel by pointing it at the{' '}
        <code>apps/web</code> directory, or build and serve with <code>pnpm build &amp;&amp; pnpm start</code>{' '}
        inside <code>apps/web</code>.
      </p>

      <h2>Environment variables summary</h2>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Where</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>DATABASE_URL</code></td>
            <td>api</td>
            <td>PostgreSQL connection string</td>
          </tr>
          <tr>
            <td><code>BETTER_AUTH_SECRET</code></td>
            <td>api</td>
            <td>Random secret for session signing</td>
          </tr>
          <tr>
            <td><code>BETTER_AUTH_URL</code></td>
            <td>api</td>
            <td>Public URL of the API server</td>
          </tr>
          <tr>
            <td><code>ENCRYPTION_KEY</code></td>
            <td>api</td>
            <td>64 hex chars (32 bytes) for AES-256-GCM</td>
          </tr>
          <tr>
            <td><code>WEB_ORIGIN</code></td>
            <td>api</td>
            <td>Web app origin for CORS</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_API_URL</code></td>
            <td>web</td>
            <td>Public URL of the API (client-side)</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
