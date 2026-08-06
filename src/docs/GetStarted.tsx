import { CloudPicker } from "./CloudPicker";
import { useCloudChoice } from "./cloudChoice";
import { getDocContent, selectCloud } from "./loader";
import { DocMarkdown } from "./markdown";

// A normal docs page whose step 1 is a control: the reader picks a cloud, and
// the remaining steps fade in written for that cloud. Nothing below the picker
// exists until then, because every command differs by provider and a page that
// hedges across three of them is slower to follow.
const PICKER_MARKER = /^\{%\s*picker\s*%\}$/m;

export function GetStarted() {
  const [cloud, setCloud] = useCloudChoice();

  const markdown = getDocContent("/docs/get-started")?.markdown ?? "";
  const marker = markdown.match(PICKER_MARKER);
  const splitAt = marker?.index ?? markdown.length;
  const intro = markdown.slice(0, splitAt);
  const steps = markdown.slice(splitAt + (marker?.[0].length ?? 0));

  return (
    <div className={`w-full min-w-0 pt-4 lg:pt-0 ${cloud ? "" : "cloud-gated"}`}>
      <article id="doc-article" className="doc-prose">
        <DocMarkdown markdown={intro} />
        <CloudPicker selected={cloud} onSelect={setCloud} />
        {cloud && (
          // Keyed so switching clouds replays the fade rather than swapping
          // the text in place.
          <div key={cloud} className="cloud-steps">
            <DocMarkdown markdown={selectCloud(steps, cloud)} />
          </div>
        )}
      </article>
    </div>
  );
}
