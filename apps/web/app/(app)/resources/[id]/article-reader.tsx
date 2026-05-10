'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

interface ArticleReaderProps {
  url: string;
}

export function ArticleReader({ url }: ArticleReaderProps) {
  const parse = trpc.reader.parse.useMutation();

  if (!parse.data && !parse.isPending && !parse.isError) {
    parse.mutate({ url });
  }

  if (parse.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!parse.data?.ok || parse.isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">Could not render this article in reader mode.</p>
        <Button asChild variant="outline" className="gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open original
          </a>
        </Button>
      </div>
    );
  }

  const { title, byline, siteName, contentHtml } = parse.data;

  return (
    <article className="mx-auto max-w-[680px] space-y-6 py-8">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight">{title}</h1>
        {(byline || siteName) && (
          <p className="text-sm text-muted-foreground">
            {byline && <span>{byline}</span>}
            {byline && siteName && <span> · </span>}
            {siteName && <span>{siteName}</span>}
          </p>
        )}
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            View original
          </a>
        </Button>
      </header>
      <div
        className="prose prose-zinc dark:prose-invert max-w-none font-serif text-[17px] leading-relaxed [&_img]:rounded-lg [&_pre]:font-mono [&_code]:font-mono [&_code]:text-sm"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  );
}
