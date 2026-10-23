import {
  faTimes,
  faSort,
  faFileExport,
  faFileImport,
  faQuestionCircle,
  faInfoCircle,
  faChevronDown,
  faEllipsisH,
  faCompressAlt,
  faArchive,
  faUndo,
  faFolderPlus,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from '@fortawesome/free-brands-svg-icons';
const icons = {
  github: faGithub,
  close: faTimes,
  sort: faSort,
  export: faFileExport,
  import: faFileImport,
  help: faQuestionCircle,
  info: faInfoCircle,
  chevron: faChevronDown,
  options: faEllipsisH,
  collapse: faCompressAlt,
  archive: faArchive,
  undo: faUndo,
  "new-folder": faFolderPlus,
  "import-folder": faPlusSquare,
};
export function Icon({ name }: { name: keyof typeof icons }) {
  const [width, height, , , paths] = icons[name].icon;
  return (
    <svg
      className="bt-icon"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      style={{ fill: "currentColor", stroke: "none" }}
    >
      {(Array.isArray(paths) ? paths : [paths]).map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}
