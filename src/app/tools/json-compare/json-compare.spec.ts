import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { JwtDecoder } from '../jwt-decoder/jwt-decoder';
import { JsonCompare } from './json-compare';
import { compareJson, parseJson } from './json-diff';

describe('JSON comparison', () => {
  it('ignores object order and reports positional array changes with unambiguous paths', () => {
    const before = parseJson('{"roles":["reader"],"legacy":null,"x.y":1,"same":{"b":2,"a":1}}');
    const after = parseJson('{"x.y":"1","roles":["editor","reader"],"same":{"a":1,"b":2}}');
    expect(compareJson(before, after).differences.map(diff => [diff.kind, diff.path])).toEqual([
      ['changed', '$["roles"][0]'], ['added', '$["roles"][1]'], ['removed', '$["legacy"]'], ['changed', '$["x.y"]'],
    ]);
  });

  it('treats prototype-like keys as ordinary fields', () => {
    const differences = compareJson(parseJson('{}'), parseJson('{"__proto__":null}')).differences;
    expect(differences.map(diff => [diff.kind, diff.path, diff.after === null])).toEqual([
      ['added', '$["__proto__"]', true],
    ]);
  });

  it('transfers a Unicode JWT payload without putting it in the URL or history state', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'jwt-decoder', component: JwtDecoder },
      { path: 'json-vergleich', component: JsonCompare },
    ])] });
    const harness = await RouterTestingHarness.create();
    const jwt = await harness.navigateByUrl('/jwt-decoder', JwtDecoder);
    const payload = '{"city":"Köln"}';
    const bytes = new TextEncoder().encode(payload);
    jwt.jwtInput.set('e30.' + btoa(String.fromCharCode(...bytes)).replace(/=+$/, '') + '.demo');
    harness.detectChanges();
    const link = harness.routeDebugElement!.query(By.css('a'));
    expect(link.nativeElement.getAttribute('href')).toBe('/json-vergleich');
    link.nativeElement.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect((harness.routeDebugElement!.componentInstance as JsonCompare).left()).toBe(payload);
    expect(JSON.stringify(history.state)).not.toContain('Köln');
  });
});
