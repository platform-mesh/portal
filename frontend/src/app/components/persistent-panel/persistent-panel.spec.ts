import { PROVIDER_PANEL_MESSAGE } from '../../services/persistent-panel/persistent-panel.types';
import { PersistentPanelComponent } from './persistent-panel';
import { ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { afterEach, describe, expect, it, vi } from 'vitest';

const providerOrigin = 'https://provider.example.test';
const config = {
  id: 'provider.tools',
  title: 'Provider tools',
  url: `${providerOrigin}/panel`,
  origin: providerOrigin,
};

describe('PersistentPanelComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts context and lifecycle messages only to the registered origin', () => {
    const postMessage = vi.fn();
    const component = createComponent();
    component.panelFrame = frameWith(postMessage);

    component.open(config, { organization: 'showroom' });
    component.frameLoaded();
    component.close();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: PROVIDER_PANEL_MESSAGE.context }),
      providerOrigin,
    );
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: PROVIDER_PANEL_MESSAGE.close, requestId: 1 },
      providerOrigin,
    );
    component.ngOnDestroy();
  });

  it('retains the iframe until the provider acknowledges cleanup', () => {
    const postMessage = vi.fn();
    const frameWindow = { postMessage } as unknown as WindowProxy;
    const component = createComponent();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, { organization: 'showroom' });

    component.close();

    expect(component.closing()).toBe(true);
    expect(component.source()).not.toBeNull();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closed, requestId: 1 },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );

    expect(component.closing()).toBe(false);
    expect(component.source()).toBeNull();
    component.ngOnDestroy();
  });

  it('ignores lifecycle messages from a different source or origin', () => {
    const frameWindow = { postMessage: vi.fn() } as unknown as WindowProxy;
    const component = createComponent();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, {});
    component.close();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closed, requestId: 1 },
        origin: 'https://attacker.example',
        source: frameWindow,
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closed, requestId: 1 },
        origin: providerOrigin,
        source: { postMessage: vi.fn() } as unknown as WindowProxy,
      }),
    );

    expect(component.closing()).toBe(true);
    expect(component.source()).not.toBeNull();
    component.ngOnDestroy();
  });

  it('cancels stale close completion when the panel is reopened', () => {
    vi.useFakeTimers();
    const frameWindow = { postMessage: vi.fn() } as unknown as WindowProxy;
    const component = createComponent();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, {});
    component.close();

    component.open(config, { account: 'team-a' });
    vi.advanceTimersByTime(30_000);
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closed, requestId: 1 },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );

    expect(component.closing()).toBe(false);
    expect(component.source()).not.toBeNull();
    expect(component.state()).toBe('expanded');
    component.ngOnDestroy();
  });

  it('keeps an unresponsive iframe visible after the bounded timeout', () => {
    vi.useFakeTimers();
    const postMessage = vi.fn();
    const component = createComponent();
    component.panelFrame = frameWith(postMessage);
    component.open(config, {});

    component.close();
    vi.advanceTimersByTime(30_000);

    expect(component.closing()).toBe(false);
    expect(component.source()).not.toBeNull();
    expect(component.state()).toBe('expanded');
    expect(component.closeError()).toMatch(/cleanup is incomplete/i);

    component.close();
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: PROVIDER_PANEL_MESSAGE.close, requestId: 2 },
      providerOrigin,
    );
    expect(component.closing()).toBe(true);
    component.ngOnDestroy();
  });

  it('keeps the iframe visible when the provider reports cleanup failure', () => {
    const frameWindow = { postMessage: vi.fn() } as unknown as WindowProxy;
    const component = createComponent();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, {});
    component.close();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closeFailed, requestId: 1 },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );

    expect(component.closing()).toBe(false);
    expect(component.source()).not.toBeNull();
    expect(component.state()).toBe('expanded');
    expect(component.closeError()).toMatch(/cleanup is incomplete/i);
    component.ngOnDestroy();
  });
});

function createComponent(): PersistentPanelComponent {
  const injector = Injector.create({
    providers: [
      {
        provide: DomSanitizer,
        useValue: { bypassSecurityTrustResourceUrl: (url: string) => url },
      },
    ],
  });
  return runInInjectionContext(injector, () => new PersistentPanelComponent());
}

function frameWith(postMessage: ReturnType<typeof vi.fn>) {
  return new ElementRef({
    contentWindow: { postMessage } as unknown as WindowProxy,
  } as HTMLIFrameElement);
}
