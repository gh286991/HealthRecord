import { promises as fs } from 'fs';
import path from 'path';

export async function loadTemplateHtml(fileName: string) {
  // fileName like 'verify-email.html'
  const p = path.resolve(__dirname, 'templates', fileName);
  return fs.readFile(p, 'utf8');
}

export function interpolate(template: string, vars: Record<string, string>) {
  return template.replace(/{{\s*([\w.-]+)\s*}}/g, (_, k) => (vars[k] ?? ''));
}

export function htmlToText(html: string) {
  // very naive fallback: strip tags and decode basic entities
  const withoutTags = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '');
  return withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

