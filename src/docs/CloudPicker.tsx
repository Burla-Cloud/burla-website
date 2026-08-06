import type { ReactElement } from "react";
import type { Cloud } from "./cloudChoice";

// The three cloud marks, inlined from the Wikimedia Commons brand SVGs
// (Amazon_Web_Services_Logo.svg, Google_Cloud_logo.svg, Microsoft_Azure.svg)
// and drawn in currentColor so the tile owns the color, the same monochrome
// treatment the landing page uses for these marks. Each path carries its own
// fill-opacity: it stands in for the brand's multi-tone facets, and without it
// the marks collapse into flat silhouettes as soon as the fill goes opaque.
function AwsLogo() {
  return (
    <svg viewBox="0 0 304 182" role="presentation" fill="currentColor">
      <path fillOpacity={1} d="M86.4 66.4c0 3.7.4 6.7 1.1 8.9.8 2.2 1.8 4.6 3.2 7.2.5.8.7 1.6.7 2.3 0 1-.6 2-1.9 3l-6.3 4.2c-.9.6-1.8.9-2.6.9-1 0-2-.5-3-1.4-1.4-1.5-2.6-3.1-3.6-4.7-1-1.7-2-3.6-3.1-5.9-7.8 9.2-17.6 13.8-29.4 13.8-8.4 0-15.1-2.4-20-7.2-4.9-4.8-7.4-11.2-7.4-19.2 0-8.5 3-15.4 9.1-20.6 6.1-5.2 14.2-7.8 24.5-7.8 3.4 0 6.9.3 10.6.8 3.7.5 7.5 1.3 11.5 2.2v-7.3c0-7.6-1.6-12.9-4.7-16-3.2-3.1-8.6-4.6-16.3-4.6-3.5 0-7.1.4-10.8 1.3-3.7.9-7.3 2-10.8 3.4-1.6.7-2.8 1.1-3.5 1.3-.7.2-1.2.3-1.6.3-1.4 0-2.1-1-2.1-3.1v-4.9c0-1.6.2-2.8.7-3.5.5-.7 1.4-1.4 2.8-2.1 3.5-1.8 7.7-3.3 12.6-4.5 4.9-1.3 10.1-1.9 15.6-1.9 11.9 0 20.6 2.7 26.2 8.1 5.5 5.4 8.3 13.6 8.3 24.6v32.4zM45.8 81.6c3.3 0 6.7-.6 10.3-1.8 3.6-1.2 6.8-3.4 9.5-6.4 1.6-1.9 2.8-4 3.4-6.4.6-2.4 1-5.3 1-8.7v-4.2c-2.9-.7-6-1.3-9.2-1.7-3.2-.4-6.3-.6-9.4-.6-6.7 0-11.6 1.3-14.9 4-3.3 2.7-4.9 6.5-4.9 11.5 0 4.7 1.2 8.2 3.7 10.6 2.4 2.5 5.9 3.7 10.5 3.7zm80.3 10.8c-1.8 0-3-.3-3.8-1-.8-.6-1.5-2-2.1-3.9L96.7 10.2c-.6-2-.9-3.3-.9-4 0-1.6.8-2.5 2.4-2.5h9.8c1.9 0 3.2.3 3.9 1 .8.6 1.4 2 2 3.9l16.8 66.2 15.6-66.2c.5-2 1.1-3.3 1.9-3.9.8-.6 2.2-1 4-1h8c1.9 0 3.2.3 4 1 .8.6 1.5 2 1.9 3.9l15.8 67 17.3-67c.6-2 1.3-3.3 2-3.9.8-.6 2.1-1 3.9-1h9.3c1.6 0 2.5.8 2.5 2.5 0 .5-.1 1-.2 1.6-.1.6-.3 1.4-.7 2.5l-24.1 77.3c-.6 2-1.3 3.3-2.1 3.9-.8.6-2.1 1-3.8 1h-8.6c-1.9 0-3.2-.3-4-1-.8-.7-1.5-2-1.9-4L156 23l-15.4 64.4c-.5 2-1.1 3.3-1.9 4-.8.7-2.2 1-4 1h-8.6zm128.5 2.7c-5.2 0-10.4-.6-15.4-1.8-5-1.2-8.9-2.5-11.5-4-1.6-.9-2.7-1.9-3.1-2.8-.4-.9-.6-1.9-.6-2.8v-5.1c0-2.1.8-3.1 2.3-3.1.6 0 1.2.1 1.8.3.6.2 1.5.6 2.5 1 3.4 1.5 7.1 2.7 11 3.5 4 .8 7.9 1.2 11.9 1.2 6.3 0 11.2-1.1 14.6-3.3 3.4-2.2 5.2-5.4 5.2-9.5 0-2.8-.9-5.1-2.7-7-1.8-1.9-5.2-3.6-10.1-5.2L246 52c-7.3-2.3-12.7-5.7-16-10.2-3.3-4.4-5-9.3-5-14.5 0-4.2.9-7.9 2.7-11.1 1.8-3.2 4.2-6 7.2-8.2 3-2.3 6.4-4 10.4-5.2 4-1.2 8.2-1.7 12.6-1.7 2.2 0 4.5.1 6.7.4 2.3.3 4.4.7 6.5 1.1 2 .5 3.9 1 5.7 1.6 1.8.6 3.2 1.2 4.2 1.8 1.4.8 2.4 1.6 3 2.5.6.8.9 1.9.9 3.3v4.7c0 2.1-.8 3.2-2.3 3.2-.8 0-2.1-.4-3.8-1.2-5.7-2.6-12.1-3.9-19.2-3.9-5.7 0-10.2.9-13.3 2.8-3.1 1.9-4.7 4.8-4.7 8.9 0 2.8 1 5.2 3 7.1 2 1.9 5.7 3.8 11 5.5l14.2 4.5c7.2 2.3 12.4 5.5 15.5 9.6 3.1 4.1 4.6 8.8 4.6 14 0 4.3-.9 8.2-2.6 11.6-1.8 3.4-4.2 6.4-7.3 8.8-3.1 2.5-6.8 4.3-11.1 5.6-4.5 1.4-9.2 2.1-14.3 2.1z" />
      <path
        fillOpacity={0.72}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M273.5 143.7c-32.9 24.3-80.7 37.2-121.8 37.2-57.6 0-109.5-21.3-148.7-56.7-3.1-2.8-.3-6.6 3.4-4.4 42.4 24.6 94.7 39.5 148.8 39.5 36.5 0 76.6-7.6 113.5-23.2 5.5-2.5 10.2 3.6 4.8 7.6z"
      />
      <path
        fillOpacity={0.72}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M287.2 128.1c-4.2-5.4-27.8-2.6-38.5-1.3-3.2.4-3.7-2.4-.8-4.5 18.8-13.2 49.7-9.4 53.3-5 3.6 4.5-1 35.4-18.6 50.2-2.7 2.3-5.3 1.1-4.1-1.9 4-9.9 12.9-32.2 8.7-37.5z"
      />
    </svg>
  );
}

function GoogleCloudLogo() {
  return (
    <svg viewBox="1 0.1 32.9 26.4" role="presentation" fill="currentColor">
      <path fillOpacity={0.7} d="M21.85 7.41l1 0 2.85-2.85.14-1.21A12.81 12.81 0 0 0 5 9.6a1.55 1.55 0 0 1 1-.06l5.7-.94s.29-.48.44-.45a7.11 7.11 0 0 1 9.73-.74z" />
      <path fillOpacity={1} d="M29.76 9.6a12.84 12.84 0 0 0-3.87-6.24l-4 4A7.11 7.11 0 0 1 24.5 13v.71a3.56 3.56 0 1 1 0 7.12h-7.12l-.71.72v4.27l.71.71h7.12A9.26 9.26 0 0 0 29.76 9.6z" />
      <path fillOpacity={0.82} d="M10.25 26.49h7.12v-5.7h-7.12a3.54 3.54 0 0 1-1.47-.32l-1 .31-2.87 2.85-.25 1a9.21 9.21 0 0 0 5.59 1.86z" />
      <path fillOpacity={0.58} d="M10.25 8a9.26 9.26 0 0 0-5.59 16.6l4.13-4.13a3.56 3.56 0 1 1 4.71-4.71l4.13-4.13A9.25 9.25 0 0 0 10.25 8z" />
    </svg>
  );
}

function AzureLogo() {
  return (
    <svg viewBox="4.1 6.5 88.5 83" role="presentation" fill="currentColor">
      <path fillOpacity={0.68} d="M33.338 6.544h26.038l-27.03 80.087a4.152 4.152 0 0 1-3.933 2.824H8.149a4.145 4.145 0 0 1-3.928-5.47L29.404 9.368a4.152 4.152 0 0 1 3.934-2.825z" />
      <path fillOpacity={0.84} d="M71.175 60.261h-41.29a1.911 1.911 0 0 0-1.305 3.309l26.532 24.764a4.171 4.171 0 0 0 2.846 1.121h23.38z" />
      <path fillOpacity={1} d="M66.595 9.364a4.145 4.145 0 0 0-3.928-2.82H33.648a4.146 4.146 0 0 1 3.928 2.82l25.184 74.62a4.146 4.146 0 0 1-3.928 5.472h29.02a4.146 4.146 0 0 0 3.927-5.472z" />
    </svg>
  );
}

// Each mark gets its own optical size: the AWS wordmark is wide and light,
// the Azure and GCP marks are compact, so equal heights would read as three
// different sizes.
const CLOUD_TILES: {
  id: Cloud;
  label: string;
  Logo: () => ReactElement;
  width: number;
}[] = [
  { id: "aws", label: "Amazon Web Services", Logo: AwsLogo, width: 130 },
  { id: "gcp", label: "Google Cloud", Logo: GoogleCloudLogo, width: 92 },
  { id: "azure", label: "Microsoft Azure", Logo: AzureLogo, width: 84 },
];

export function CloudPicker({
  selected,
  onSelect,
}: {
  selected: Cloud | null;
  onSelect: (cloud: Cloud) => void;
}) {
  return (
    <div
      className="cloud-picker"
      data-chosen={selected ? "true" : undefined}
      role="radiogroup"
      aria-label="Cloud provider"
    >
      {CLOUD_TILES.map(({ id, label, Logo, width }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={selected === id}
          aria-label={label}
          onClick={() => onSelect(id)}
          className="cloud-tile"
          data-selected={selected === id ? "true" : undefined}
        >
          <span className="cloud-tile-stage">
            {/* Two nested layers on purpose: the outer one owns the endless
                drift, the inner one owns the hover lift, so hovering never has
                to cancel a running animation (which snaps). */}
            <span className="cloud-tile-float">
              <span className="cloud-tile-lift">
                <span
                  className="cloud-tile-mark"
                  style={{ ["--mark-w" as string]: width }}
                >
                  <Logo />
                </span>
              </span>
            </span>
            <span className="cloud-tile-shadow" aria-hidden="true" />
          </span>
        </button>
      ))}
    </div>
  );
}
