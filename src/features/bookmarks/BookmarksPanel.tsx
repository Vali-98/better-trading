import { useState } from "react";
import { BackupControls } from "./BackupControls";
import { Dialog } from "../../components/Dialog";
import { Icon } from "../../components/Icon";
import { Collapsible } from "../../components/Collapsible";
import {
  SortableList,
  SortableItem,
  DragHandle,
} from "../../components/Sortable";
import { serialize } from "../../lib/bookmarks/export";
import { recommendTitle } from "../../lib/searchPanel";
import { browser } from "wxt/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  currentLocation,
  getFolders,
  getTrades,
  saveFolders,
  saveTrades,
  tradeUrl,
  type Folder,
  type Trade,
} from "../../lib/bookmarks/storage";

const button = "bt-button";
const itemIconOrder = [
  "alchemy",
  "chaos",
  "exalt",
  "divine",
  "mirror",
  "card",
  "essence",
  "fossil",
  "map",
  "scarab",
  "annul",
  "vaal",
  "regal",
  "transmute",
  "chance",
  "glassblower",
  "rune",
  "waystone",
  "wisdom",
];
const baseIcon = (icon: string) => icon.replace(/^poe2-/, "");
const iconNames = Object.keys(
  import.meta.glob("../../../public/assets/images/bookmark-folder/*.png"),
).map((path) => path.split("/").pop()!.replace(".png", ""));
const iconUrl = (icon: string) =>
  new URL(
    `bookmark-folder/${encodeURIComponent(icon)}.png`,
    browser.runtime.getURL("/assets/images/logo.png"),
  ).href;
function reordered<T>(items: T[], from: number, to: number) {
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
export function BookmarksPanel() {
  const client = useQueryClient();
  const folders = useQuery({
    queryKey: ["bookmarks", "folders"],
    queryFn: getFolders,
  });
  const [archived, setArchived] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Folder | null>(null);
  const [expanded, setExpanded] = useState(() =>
    (localStorage.getItem("bt-bookmark-folders-expansion") ?? "")
      .split(",")
      .filter(Boolean),
  );
  function expand(ids: string[]) {
    setExpanded(ids);
    localStorage.setItem("bt-bookmark-folders-expansion", ids.join(","));
  }
  const mutation = useMutation({
    mutationFn: saveFolders,
    onMutate: async (items) => {
      await client.cancelQueries({ queryKey: ["bookmarks", "folders"] });
      client.setQueryData(["bookmarks", "folders"], items);
    },
    onError: () =>
      client.invalidateQueries({ queryKey: ["bookmarks", "folders"] }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
  const visibleFolders = (folders.data ?? []).filter(
    (folder) =>
      folder.version === currentLocation().version &&
      Boolean(folder.archivedAt) === archived,
  );
  const reorderMutation = useMutation({
    mutationFn: saveFolders,
    meta: { silentSuccess: true },
    onSettled: () =>
      client.invalidateQueries({ queryKey: ["bookmarks", "folders"] }),
  });
  return (
    <section className="bt-bookmarks">
      <div className="bt-bookmark-toolbar">
        <button className={button} onClick={() => expand([])}>
          <Icon name="collapse" /> Collapse all
        </button>
        <button className={button} onClick={() => setArchived(!archived)}>
          <Icon name={archived ? "undo" : "archive"} />{" "}
          {archived ? "Show active" : "Show archived"}
        </button>
      </div>
      {folders.isPending && <p role="status">Loading bookmarks…</p>}
      {(folders.error || mutation.error) && (
        <p role="alert">Unable to save or load bookmarks.</p>
      )}
      <div className="bt-folder-list">
        <SortableList
          ids={visibleFolders.map((folder) => folder.id)}
          onMove={(from, to) => {
            const ordered = reordered(visibleFolders, from, to);
            let index = 0;
            const updated = (folders.data ?? []).map((folder) =>
              visibleFolders.includes(folder) ? ordered[index++] : folder,
            );
            client.setQueryData(["bookmarks", "folders"], updated);
            reorderMutation.mutate(updated);
          }}
        >
          {visibleFolders.map((folder) => (
            <SortableItem
              id={folder.id}
              key={folder.id}
              className="bt-folder-wrapper"
            >
              <FolderView
                folder={folder}
                expanded={expanded.includes(folder.id)}
                toggle={() =>
                  expand(
                    expanded.includes(folder.id)
                      ? expanded.filter((id) => id !== folder.id)
                      : [...expanded, folder.id],
                  )
                }
                edit={() => setEditing({ ...folder })}
                archive={() =>
                  mutation.mutate([
                    ...(folders.data ?? []).filter(
                      (item) => item.id !== folder.id,
                    ),
                    {
                      ...folder,
                      archivedAt: folder.archivedAt
                        ? null
                        : new Date().toISOString(),
                    },
                  ])
                }
                remove={async () => {
                  await browser.storage.local.remove(
                    `bookmark-trades--${folder.id}`,
                  );
                  mutation.mutate(
                    (folders.data ?? []).filter(
                      (item) => item.id !== folder.id,
                    ),
                  );
                }}
              />
            </SortableItem>
          ))}
        </SortableList>
      </div>
      {!archived && (
        <div className="bt-folder-create-actions">
          <button
            className={button}
            disabled={!folders.data}
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                title: "",
                version: currentLocation().version,
                icon: null,
                archivedAt: null,
              })
            }
          >
            <Icon name="new-folder" /> New folder
          </button>
          <button className={button} onClick={() => setImporting(true)}>
            <Icon name="import-folder" /> Import folder
          </button>
        </div>
      )}
      {editing && (
        <Dialog
          title={
            folders.data?.some((folder) => folder.id === editing.id)
              ? "Edit folder"
              : "Create folder"
          }
          close={() => setEditing(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const items = folders.data ?? [];
              mutation.mutate(
                items.some((folder) => folder.id === editing.id)
                  ? items.map((folder) =>
                      folder.id === editing.id ? editing : folder,
                    )
                  : [...items, editing],
                {
                  onSuccess: () => {
                    expand([...expanded, editing.id]);
                    setEditing(null);
                  },
                },
              );
            }}
          >
            <label>
              Title
              <input
                required
                autoFocus
                value={editing.title}
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
            </label>
            <fieldset className="bt-icon-picker">
              <legend>Icon</legend>
              {[true, false].map((items) => (
                <div key={String(items)}>
                  <div
                    role="group"
                    aria-label={
                      items ? "Currency and item icons" : "Character icons"
                    }
                    className={`bt-icon-grid ${items ? "bt-item-icon-grid" : "bt-character-icon-grid"}`}
                  >
                    {items && (
                      <button
                        type="button"
                        className="bt-icon-option"
                        aria-label="No icon"
                        aria-pressed={!editing.icon}
                        onClick={() => setEditing({ ...editing, icon: null })}
                      >
                        <Icon name="close" />
                      </button>
                    )}
                    {iconNames
                      .filter(
                        (icon) =>
                          icon.startsWith("poe2-") ===
                          (editing.version === "2"),
                      )
                      .filter(
                        (icon) =>
                          itemIconOrder.includes(baseIcon(icon)) === items,
                      )
                      .sort((a, b) =>
                        items
                          ? itemIconOrder.indexOf(baseIcon(a)) -
                            itemIconOrder.indexOf(baseIcon(b))
                          : a.localeCompare(b),
                      )
                      .map((icon) => (
                        <button
                          type="button"
                          className="bt-icon-option"
                          key={icon}
                          aria-label={icon.replaceAll("-", " ")}
                          title={icon.replaceAll("-", " ")}
                          aria-pressed={editing.icon === icon}
                          onClick={() => setEditing({ ...editing, icon })}
                        >
                          <img src={iconUrl(icon)} alt="" />
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </fieldset>
            <button className={button} disabled={mutation.isPending}>
              Save folder
            </button>
            {mutation.error && <p role="alert">Unable to save folder.</p>}
          </form>
        </Dialog>
      )}
      <BackupControls
        importing={importing}
        closeImport={() => setImporting(false)}
      />
    </section>
  );
}

function FolderView({
  folder,
  archive,
  expanded,
  toggle,
  edit,
  remove,
}: {
  folder: Folder;
  archive: () => void;
  expanded: boolean;
  toggle: () => void;
  edit: () => void;
  remove: () => Promise<void>;
}) {
  const [deleteFolder, setDeleteFolder] = useState(false);
  const [draft, setDraft] = useState<Trade | null>(null);
  const [deleting, setDeleting] = useState<Trade | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [error, setError] = useState("");
  const client = useQueryClient();
  const trades = useQuery({
    queryKey: ["bookmarks", "trades", folder.id],
    queryFn: () => getTrades(folder.id),
  });
  const mutation = useMutation({
    mutationFn: (items: Trade[]) => saveTrades(folder.id, items),
    onMutate: async (items) => {
      await client.cancelQueries({
        queryKey: ["bookmarks", "trades", folder.id],
      });
      client.setQueryData(["bookmarks", "trades", folder.id], items);
    },
    onError: () =>
      client.invalidateQueries({
        queryKey: ["bookmarks", "trades", folder.id],
      }),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: ["bookmarks", "trades", folder.id],
      }),
  });
  const reorderMutation = useMutation({
    mutationFn: (items: Trade[]) => saveTrades(folder.id, items),
    meta: { silentSuccess: true },
    onSettled: () =>
      client.invalidateQueries({
        queryKey: ["bookmarks", "trades", folder.id],
      }),
  });
  return (
    <div className="bt-folder">
      <header className="bt-folder-header">
        <button
          className="bt-folder-title"
          aria-expanded={expanded && !folder.archivedAt}
          onClick={toggle}
          disabled={Boolean(folder.archivedAt)}
        >
          {folder.icon && <img src={iconUrl(folder.icon)} alt="" />}
          <span>{folder.title}</span>
          {!folder.archivedAt && (
            <span
              className={`bt-expansion-arrow ${expanded ? "is-expanded" : ""}`}
            >
              <Icon name="chevron" />
            </span>
          )}
        </button>
        <details className="bt-menu">
          <summary aria-label="Folder actions">
            <Icon name="options" />
          </summary>
          <div>
            {!folder.archivedAt && <button onClick={edit}>Edit folder</button>}
            <button onClick={archive}>
              {folder.archivedAt ? "Restore folder" : "Archive folder"}
            </button>
            {folder.archivedAt && (
              <button onClick={() => setDeleteFolder(true)}>
                Delete folder
              </button>
            )}
            <button
              disabled={!trades.data}
              onClick={() => setExported(serialize(folder, trades.data ?? []))}
            >
              Export folder
            </button>
          </div>
        </details>
        <DragHandle label="Drag folder to reorder">
          <Icon name="sort" />
        </DragHandle>
      </header>
      <Collapsible open={expanded && !folder.archivedAt}>
        <div className="bt-folder-body">
          <SortableList
            ids={(trades.data ?? []).map((trade) => trade.id)}
            onMove={(from, to) => {
              const updated = reordered(trades.data ?? [], from, to);
              client.setQueryData(["bookmarks", "trades", folder.id], updated);
              reorderMutation.mutate(updated);
            }}
          >
            {trades.data?.map((trade) => (
              <SortableItem
                key={trade.id}
                id={trade.id}
                className="bt-trade-row"
              >
                <a className="flex-1 underline" href={tradeUrl(trade)}>
                  {trade.completedAt && (
                    <span className="bt-completed" aria-label="Completed">
                      ✓{" "}
                    </span>
                  )}
                  {trade.title}
                </a>
                <details className="bt-menu">
                  <summary aria-label={`Actions for ${trade.title}`}>
                    <Icon name="options" />
                  </summary>
                  <div>
                    <button
                      onClick={() =>
                        mutation.mutate(
                          trades.data.map((item) =>
                            item.id === trade.id
                              ? {
                                  ...item,
                                  completedAt: item.completedAt
                                    ? null
                                    : new Date().toISOString(),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {trade.completedAt
                        ? "Uncomplete trade"
                        : "Complete trade"}
                    </button>
                    <button onClick={() => setDraft({ ...trade })}>
                      Edit trade
                    </button>
                    <button
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(tradeUrl(trade))
                          .catch(() => setError("Unable to access clipboard."));
                      }}
                    >
                      Copy trade URL
                    </button>
                    {trade.location.type === "search" && (
                      <a href={tradeUrl(trade) + "/live"}>Open live search</a>
                    )}
                    <button
                      onClick={() => {
                        const { league: _, ...location } = currentLocation();
                        if (location.slug)
                          mutation.mutate(
                            trades.data.map((item) =>
                              item.id === trade.id
                                ? { ...item, location }
                                : item,
                            ),
                          );
                      }}
                    >
                      Update trade location
                    </button>
                    <button
                      onClick={() => {
                        const items = [...trades.data];
                        const index = items.indexOf(trade);
                        if (index > 0) {
                          [items[index - 1], items[index]] = [
                            items[index],
                            items[index - 1],
                          ];
                          mutation.mutate(items);
                        }
                      }}
                    >
                      Move up
                    </button>
                    <button onClick={() => setDeleting(trade)}>
                      Delete trade
                    </button>
                  </div>
                </details>
                <DragHandle label={`Drag ${trade.title} to reorder`}>
                  <Icon name="sort" />
                </DragHandle>
              </SortableItem>
            ))}
          </SortableList>
          <button
            className={`${button} bt-register-trade`}
            disabled={!trades.data || mutation.isPending}
            onClick={() => {
              const { league: _, ...location } = currentLocation();
              if (!location.slug) {
                setError("Run a trade search before registering it.");
                return;
              }
              setDraft({
                id: crypto.randomUUID(),
                title: recommendTitle(),
                location,
                completedAt: null,
              });
            }}
          >
            Register Current Trade
          </button>
          {(trades.error || mutation.error) && (
            <p role="alert">Unable to load or update this folder.</p>
          )}
          {error && <p role="alert">{error}</p>}
          {draft && (
            <Dialog title="Save trade" close={() => setDraft(null)}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const items = trades.data ?? [];
                  mutation.mutate(
                    items.some((item) => item.id === draft.id)
                      ? items.map((item) =>
                          item.id === draft.id ? draft : item,
                        )
                      : [...items, draft],
                    { onSuccess: () => setDraft(null) },
                  );
                }}
              >
                <label>
                  Title
                  <input
                    required
                    autoFocus
                    value={draft.title}
                    onChange={(event) =>
                      setDraft({ ...draft, title: event.target.value })
                    }
                  />
                </label>
                <button className={button} disabled={mutation.isPending}>
                  Save trade
                </button>
              </form>
            </Dialog>
          )}
          {deleting && (
            <Dialog title="Delete trade" close={() => setDeleting(null)}>
              <p>Delete {deleting.title}?</p>
              <button
                className={button}
                onClick={() =>
                  mutation.mutate(
                    (trades.data ?? []).filter(
                      (item) => item.id !== deleting.id,
                    ),
                    { onSuccess: () => setDeleting(null) },
                  )
                }
              >
                Delete
              </button>
            </Dialog>
          )}
        </div>
      </Collapsible>
      {exported && (
        <Dialog title="Export folder" close={() => setExported(null)}>
          <textarea
            aria-label="Exported folder"
            readOnly
            value={exported}
            onFocus={(event) => event.target.select()}
          />
        </Dialog>
      )}
      {deleteFolder && (
        <Dialog title="Delete folder" close={() => setDeleteFolder(false)}>
          <p>Delete {folder.title} and all its trades?</p>
          <button
            className={button}
            onClick={() => {
              void remove().catch(() => setError("Unable to delete folder."));
            }}
          >
            Delete folder
          </button>
        </Dialog>
      )}
    </div>
  );
}
