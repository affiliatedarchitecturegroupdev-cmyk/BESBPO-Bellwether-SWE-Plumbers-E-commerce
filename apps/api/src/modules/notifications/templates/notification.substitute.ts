// Deliberately leaves an unknown placeholder (a typo, or one that
// doesn't exist for this notification type) rendered AS-IS in the
// output — {{unkown_field}} shows up literally in the sent email —
// rather than silently stripping it to an empty string. An admin seeing
// their own typo in a test send is far more useful than a customer
// receiving an email with a mysteriously missing word and no way for
// anyone to notice why.
export function substitutePlaceholders(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in context ? context[key] : match));
}
