import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
export function ReleaseNotes({ markdown }: { markdown: string }) {
  return (
    <div className="bt-release-notes">
      <Markdown
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
