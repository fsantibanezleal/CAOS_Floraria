# React and the independent botanical interface

React connects state, controls, scenes and explanations through stable IDs. Studio.tsx and studio.css own the independent botanical navigation, masthead, layout, native dialogs and visual language. The former shared application frame and stylesheet are not mounted by the current entry point.

GuidePages composes supporting routes. CitationsProvider resolves IDs and each section cites only its relevant sources. Tabs/SubTabs unmount inactive content; persistent state belongs above them.

Architecture SVGs contain l-en/l-es pairs at matching coordinates and l-neutral identifiers. The selected language controls visibility. Colors use theme tokens. Keeping both languages in one SVG prevents independent drift.

Keyboard/text routes complement pointer interactions. A graphics failure must leave the collection useful. Semantic components alone do not establish blanket accessibility conformance; test supported flows and [WCAG 2.2](https://www.w3.org/TR/WCAG22/) criteria.

The lockfile defines versions. Open-source citation, equation, content-tab and preference utilities remain dependencies for the preserved field guide. Their use does not dictate the product frame or navigation.

The original App.tsx and supporting styles remain as source history; main.tsx mounts Studio.tsx. Source and attribution links in the current footer are authored for this product. See LICENSES.md for the dependency's metadata/license discrepancy and actual redistributed license text.
