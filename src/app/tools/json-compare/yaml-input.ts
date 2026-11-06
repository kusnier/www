import { parseDocument } from 'yaml';
import { checkInput, validateData } from './json-diff';

export function readYaml(input: string) {
  checkInput(input, 'YAML');
  const document = parseDocument(input, { version: '1.2', schema: 'core', stringKeys: true });
  if (document.errors.some(error => error.code === 'MULTIPLE_DOCS')) {
    throw new Error('Bitte genau ein YAML-Dokument pro Seite einfügen.');
  }
  const issue = document.errors[0] ?? document.warnings[0];
  if (issue) {
    const line = issue.linePos?.[0];
    throw new Error(line ? 'YAML kann in Zeile ' + line + ' nicht gelesen werden.' : 'Ungültiges oder nicht unterstütztes YAML.');
  }
  if (document.directives?.yaml.version !== '1.2') throw new Error('Bitte YAML 1.2 verwenden.');
  if (document.contents === null) throw new Error('Bitte YAML-Daten einfügen.');

  let data: unknown;
  try {
    data = document.toJS({ maxAliasCount: 25 });
  } catch {
    throw new Error('Die YAML-Referenzen sind ungültig oder zu komplex.');
  }
  return { value: validateData(data), format: () => document.toString() };
}
