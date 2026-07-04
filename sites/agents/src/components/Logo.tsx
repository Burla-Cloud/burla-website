interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/**
 * Burla mark — four blocks in a stair-step pattern. The original brand mark
 * sits on light backgrounds in dark teal; here it's rendered in the site's
 * sodium-yellow accent so it reads cleanly on the dark onyx nav and footer.
 */
export function Logo({
  size = 28,
  withWordmark = true,
  className = "",
}: LogoProps) {
  return (
    <a
      href="#top"
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="Burla home"
    >
      <span
        className="relative inline-block"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <rect x="1" y="7" width="6" height="6" fill="#155E75" />
          <rect x="7" y="13" width="6" height="6" fill="#155E75" />
          <rect x="1" y="19" width="6" height="6" fill="#155E75" />
          <rect x="19" y="19" width="12" height="6" fill="#155E75" />
        </svg>
      </span>
      {withWordmark && (
        <span className="font-display font-semibold text-ink tracking-tighter2 text-[17px]">
          burla
          <span className="text-inkSubtle font-medium"> / agents</span>
        </span>
      )}
    </a>
  );
}
