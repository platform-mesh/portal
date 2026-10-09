// Stub UI5 web component registrations so they render as plain HTMLElements in jsdom.
// The full UI5 rendering pipeline requires browser APIs (CSS, ShadowRoot internals)
// that are unavailable in jsdom, causing unhandled rejections in tests.
const originalDefine = customElements.define.bind(customElements);
customElements.define = (name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions) => {
  if (name.startsWith('ui5-')) {
    if (!customElements.get(name)) {
      originalDefine(name, class extends HTMLElement {}, options);
    }
  } else {
    originalDefine(name, constructor, options);
  }
};
