import ReactMarkdown, { type Components } from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import remarkGfm from 'remark-gfm';
import type { GlossaryEntry } from '@/domain/types';
import { MISSING_ENTRY, resolveWikiLinks } from '@/domain/wikiLinks';
import { glossaryPaths } from './format';

/**
 * Renders an entry body (SPEC 5.5): Markdown with GFM footnotes as numbered
 * references and [[Title]] links to other entries (DECISIONS D31). It builds React
 * elements, never raw HTML; images in the body are not rendered (the gallery is).
 */
export function MarkdownView({
  body,
  projectId,
  entries,
}: {
  body: string;
  projectId: string;
  entries: Pick<GlossaryEntry, 'id' | 'title'>[];
}) {
  const { t } = useTranslation();
  const source = resolveWikiLinks(body, entries, (id) => glossaryPaths.entry(projectId, id));

  const components: Components = {
    a: ({ href = '', children, ...props }) => {
      if (href.startsWith(MISSING_ENTRY)) {
        const title = decodeURIComponent(href.slice(MISSING_ENTRY.length));
        return (
          <span
            title={t('glossary.entry.missingLink', { title })}
            className="text-text-tertiary underline decoration-dotted"
          >
            {children}
          </span>
        );
      }
      if (href.startsWith('/')) {
        return (
          <Link to={href} className="text-text underline underline-offset-2 hover:text-accent-text">
            {children}
          </Link>
        );
      }
      // Footnote references and back links stay on the page.
      if (href.startsWith('#')) {
        return (
          <a href={href} {...props} className="text-text-secondary underline underline-offset-2">
            {children}
          </a>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text underline underline-offset-2 hover:text-accent-text"
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className="flex flex-col gap-4 text-base leading-relaxed text-text-secondary [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-fill-subtle [&_code]:px-1 [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-text [&_h2]:mt-2 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-text [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-text [&_li]:ml-5 [&_ol]:list-decimal [&_section.footnotes]:mt-4 [&_section.footnotes]:border-t [&_section.footnotes]:border-border [&_section.footnotes]:pt-4 [&_section.footnotes]:text-sm [&_strong]:text-text [&_sup]:text-xs [&_ul]:list-disc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        remarkRehypeOptions={{
          footnoteLabel: t('glossary.entry.references'),
          footnoteBackLabel: t('glossary.entry.backToReference'),
          // Shown as a visible "References" heading, as in the design.
          footnoteLabelProperties: {},
        }}
        disallowedElements={['img']}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
