# pict-section-dashboard

Embeddable Pict view for managing data-mapper Dashboards — layout-driven panels reading from `CachedView_*` tables produced by Operations.

The section provides:
- a list of dashboards in the active scope (with new / edit / delete in `manage` mode),
- a layout-driven dashboard renderer (paged-list + compact-list panels, nested row/column containers),
- a JSON-form editor for the dashboard record itself.

## Install

```
npm install pict-section-dashboard
```

Peer requires `pict-view`, `pict`, and `pict-section-modal` (for confirms / toasts).

## Mount

```js
const libPictSectionDashboard = require('pict-section-dashboard');
const libPictSectionModal     = require('pict-section-modal');

pict.addView('Modal', {}, libPictSectionModal);

pict.addView(
    'Pict-Section-Dashboard',
    Object.assign({}, libPictSectionDashboard.default_configuration,
    {
        ContentDestinationAddress: '#my-destination',
        APIBaseUrl:                '/mapper',
        Mode:                      'manage',           // 'manage' | 'render-only'
        InitialDashboardHash:      null,               // open this dashboard immediately, else show list
        WriteToken:                process.env.DATA_MAPPER_WRITE_TOKEN || null
    }),
    libPictSectionDashboard);

pict.views['Pict-Section-Dashboard'].render();
```

## Configuration

| Option                       | Default                        | Purpose |
|------------------------------|--------------------------------|---------|
| `ContentDestinationAddress`  | `#Pict-Section-Dashboard`      | CSS selector for the section's destination div. |
| `APIBaseUrl`                 | `/mapper`                      | Prefix for `/dashboards`, `/dashboard/:hash`, `/dashboard/panel-data`. |
| `Mode`                       | `'manage'`                     | `'manage'` = full CRUD; `'render-only'` = no CRUD, just lists + renders. |
| `InitialDashboardHash`       | `null`                         | Pass a hash to open that dashboard immediately, else the section starts on the list. |
| `ShowToolbar`                | `true`                         | Section's own toolbar (scope picker + "+ New"). |
| `Scope`                      | `null`                         | `null` reads from `localStorage` (shared key); `''` = global. |
| `WriteToken`                 | `null`                         | Bearer token for writes — matches `DATA_MAPPER_WRITE_TOKEN`. |
| `ListPageSize`               | `25`                           | Default panel pagination when `Layout` doesn't specify. |
| `ListCompactRows`            | `10`                           | Default cap for list-compact panels. |

## Public API

```js
const view = pict.views['Pict-Section-Dashboard'];

view.openList();
view.openEditor(idOrRecordOrNull);
view.openDashboard(hash);              // jump straight into render mode for one dashboard
view.refresh();
```

## Note on imperative DOM

Unlike `pict-section-operation` and `pict-section-mapping`, this section's recursive layout dispatcher (rows containing columns containing rows containing panels — arbitrary depth) is built with imperative DOM rather than the template-engine `{~TS:~}` iteration model. This is a CLAUDE.md "legitimate exception" — the template engine has no recursive "render this same template against my children" idiom that fits arbitrary nested JSON. The toolbar / list / editor sub-views could be carved out as template-driven later; the panel-layout dispatcher is expected to stay imperative.

## Tests

The dashboard module currently relies on integration coverage via the data-mapper's harness. Provider-level fixes (bearer-token + opaque-origin guard) match the operation + mapping section conventions.
