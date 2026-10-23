import { useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { useQueryClient } from "@tanstack/react-query";
import { backup, importFolders } from "../../lib/bookmarks/export";
import { Dialog } from "../../components/Dialog";

export function BackupControls({
  importing,
  closeImport,
}: {
  importing: boolean;
  closeImport: () => void;
}) {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  async function restore(text: string, full: boolean) {
    setBusy(true);
    setError("");
    try {
      await importFolders(text, full);
      await client.invalidateQueries({ queryKey: ["bookmarks"] });
      closeImport();
      setCode("");
    } catch {
      setError(
        "Unable to import. Check that the file or folder code is valid.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bt-backup-tools">
      <span className="bt-backup-title">Backup Tools</span>
      {importing && (
        <Dialog title="Import folder" close={closeImport}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void restore(code, false);
            }}
          >
            <label>
              Paste exported folder
              <textarea
                required
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <button className="bt-button" disabled={busy}>
              Import folder
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        </Dialog>
      )}
      <button
        className="bt-backup-action"
        disabled={busy}
        onClick={async () => {
          try {
            const url = URL.createObjectURL(
              new Blob([await backup()], { type: "text/plain" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "better-trading-backup.txt";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch {
            setError("Unable to generate backup.");
          }
        }}
      >
        <span className="bt-backup-icon">
          <Icon name="export" />
        </span>{" "}
        Save File
      </button>
      <button
        type="button"
        className="bt-backup-action"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      >
        <span className="bt-backup-icon">
          <Icon name="import" />
        </span>{" "}
        Restore from File
      </button>
      <input
        ref={fileInput}
        hidden
        aria-label="Restore backup from file"
        type="file"
        accept=".txt,text/plain"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file)
            void file
              .text()
              .then((text) => restore(text, true))
              .catch(() => setError("Unable to read backup."));
          event.target.value = "";
        }}
      />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
