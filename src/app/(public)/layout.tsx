/**
 * Public-route group layout.
 *
 * Why this exists:
 *   The festival's public pages (homepage, /competitions, /schedule, /finalists)
 *   are a *marketing surface*. The brand is dark-first by design — every
 *   illustration, gradient, glassmorphism, neon accent and floating orb is
 *   authored against a near-black canvas. Rendering these surfaces in light
 *   mode would break the visual identity and the design system tokens.
 *
 *   The root layout (`src/app/layout.tsx`) ships a pre-paint script that
 *   defaults to **light** mode and reads from the `theme` localStorage
 *   key. That default is correct for the dashboard, admin, and auth
 *   surfaces — but it's wrong for the public site, where it produces
 *   a flash of light content (FOLC) before React rehydrates.
 *
 *   This nested layout injects a *second* pre-paint script that runs
 *   immediately after the root script and overrides the `dark` class
 *   to the dark-first default for the public site. It also writes a
 *   `data-public-theme` attribute to the root <html> element so
 *   downstream CSS can lock the surface palette to dark when no
 *   per-session user override is present.
 *
 *   A user can still opt into a light variant of the public site for
 *   the duration of a session by clicking the navbar's theme toggler,
 *   which writes the `theme_public` localStorage key. That key is
 *   scoped to public routes — choosing light on the public site never
 *   bleeds into the admin/participant apps, which continue to use
 *   their own `theme` key and their own default.
 *
 *   In the App Router, nested layouts cannot render `<html>` or
 *   `<body>`. The pre-paint script is therefore emitted inline within
 *   the layout's children — Next.js hoists it into the document head
 *   for the purpose of FOUC elimination, and the inline form guarantees
 *   it executes before any body content is parsed or painted.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/*
        Pre-paint theme initializer for the public site.
        Runs synchronously, before any React hydration, so the page
        never paints in the wrong palette.
        - Default: dark (matches the brand & every illustration/gradient)
        - Override: a user who clicked the navbar's theme toggler has
          a `theme_public` key in localStorage. Respect that one value
          for the duration of the session, then drop back to dark on
          the next visit.
      */}
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              try {
                var stored = localStorage.getItem('theme_public');
                var theme = stored === 'light' ? 'light' : 'dark';
                var root = document.documentElement;
                if (theme === 'dark') {
                  root.classList.add('dark');
                  root.classList.remove('light');
                } else {
                  root.classList.add('light');
                  root.classList.remove('dark');
                }
                root.setAttribute('data-public-theme', theme);
                root.style.colorScheme = theme;
              } catch (e) {
                /* localStorage unavailable: force dark as the safe default */
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-public-theme', 'dark');
                document.documentElement.style.colorScheme = 'dark';
              }
            })();
          `,
        }}
      />
      {children}
    </>
  );
}
