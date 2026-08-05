import { Link } from "react-router-dom";
import { getDocContent } from "./loader";
import { DocMarkdown } from "./markdown";
import { BasicsCover, ExamplesCover } from "./ExamplesCover";

export function DocPage({ route }: { route: string }) {
  if (route === "/docs/examples" || route === "/docs/basics") {
    return (
      <div id="doc-article" className="w-full min-w-0 pt-4 lg:pt-0">
        {route === "/docs/examples" ? <ExamplesCover /> : <BasicsCover />}
      </div>
    );
  }

  const content = getDocContent(route);

  if (!content) {
    return (
      <p className="pt-10 text-inkDim">
        This page could not be loaded.{" "}
        <Link to="/docs/get-started" className="text-accent underline">
          Back to the docs.
        </Link>
      </p>
    );
  }

  return (
    <div className="w-full min-w-0 pt-4 lg:pt-0">
      <article id="doc-article" className="doc-prose">
        <DocMarkdown markdown={content.markdown} />
      </article>
    </div>
  );
}
