const faqs = [
  {
    q: 'Is Learnspace free?',
    a: 'Yes. The application itself is free and open-source (MIT). You pay for your own API usage — YouTube Data API v3 is free, and Brave Search has a free tier of 2,000 queries/month.',
  },
  {
    q: 'Can I use Learnspace without API keys?',
    a: 'No. YouTube and Brave Search keys are required to search for resources. Without them, you cannot create a workspace or search. This is intentional — we never store or proxy traffic through our own API keys.',
  },
  {
    q: 'Why does a video show a YouTube logo?',
    a: 'YouTube\'s Terms of Service require the YouTube logo to remain visible in the player even when using modestbranding=1. This is a ToS requirement, not a design choice.',
  },
  {
    q: 'Why can\'t I turn off ads on YouTube videos?',
    a: 'The YouTube IFrame API does not allow disabling ads on monetised videos. We display a notice in the UI and prefer academic/educational channels in search. We will never claim to be "ad-free".',
  },
  {
    q: 'Some articles don\'t display in reader mode.',
    a: 'Mozilla Readability works on approximately 80% of sites. Some sites block server-side fetching (Cloudflare protection, paywalls). In these cases, a fallback "Open original" button appears.',
  },
  {
    q: 'How is my data deleted?',
    a: 'Workspaces, resources, and notes use soft-delete with a 30-day recovery window. After 30 days, a scheduled job permanently removes the data. Account deletion cascades immediately to all associated data.',
  },
  {
    q: 'Can I export my notes?',
    a: 'Workspace export to Markdown is a planned Should-have feature, coming after the stable MVP.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Not yet. The web app is responsive and works in mobile browsers. A dedicated app (Expo + React Native) is planned no sooner than 6–9 months after the public MVP.',
  },
];

export default function FaqPage() {
  return (
    <>
      <h1>Frequently asked questions</h1>
      <dl className="space-y-6">
        {faqs.map((faq) => (
          <div key={faq.q}>
            <dt className="font-semibold">{faq.q}</dt>
            <dd className="mt-1 text-muted-foreground">{faq.a}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
