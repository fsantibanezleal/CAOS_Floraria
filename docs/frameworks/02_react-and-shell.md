# React and the shared shell

React connects state, controls, scene and explanations through stable IDs. The shared shell provides navigation, theme/language, content tabs, math/citations and architecture dialog.

GuidePages composes supporting routes. CitationsProvider resolves IDs and each section cites only its relevant sources. Tabs/SubTabs unmount inactive content; persistent state belongs above them.

Architecture SVGs contain l-en/l-es pairs at matching coordinates and l-neutral identifiers. The selected language controls visibility. Colors use theme tokens. Keeping both languages in one SVG prevents independent drift.

Keyboard/text routes complement pointer interactions. A graphics failure must leave the collection useful. Semantic components alone do not establish blanket accessibility conformance; test supported flows and [WCAG 2.2](https://www.w3.org/TR/WCAG22/) criteria.

The lockfile defines versions. Local styles compose shell primitives instead of replacing them.

The pinned shell 0.6.2 has a fixed footer license string that says open source. FLORARIA keeps its shared footer but hides that inaccurate string with a product-scoped adapter and supplies a truthful Apache-2.0-code/private-repository disclaimer. This does not change header, navigation, author attribution or source credits.
