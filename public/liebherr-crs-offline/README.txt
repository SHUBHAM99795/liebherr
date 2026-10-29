LIEBHERR CRS OFFLINE MIGRATION BUNDLE

Upload this entire ZIP to the Microsoft app builder. Extract it if required.

index.html: application source with only dependency/asset paths changed to local paths.
original/index.html: unmodified source from the Replit project (uses CDN dependencies).
vendor/: jsPDF 2.5.1 and docx 8.5.0 browser UMD libraries.
fonts/fonts.css: local stylesheet for all originally requested font weights.
fonts/: Bebas Neue 400; Barlow Condensed 400,500,600,700,800,900;
        Barlow 300,400,500,600; Roboto Mono 400,500.
fonts/google-fonts-original.css: original Google Fonts response for provenance.
LiebherrHeadOffice-Black.ttf: original Liebherr font from this project.
liebherr-logo.jpg, favicon.svg, opengraph.jpg: original app assets.

Run index.html using a local HTTP server, not by double-clicking a file:// URL:
PDF font embedding uses fetch and therefore requires HTTP serving.
All runtime font/library references in the bundled index.html are local.
No calculator logic or report layout was changed for this bundle.
Word uses the Liebherr Head Office family; Word may require the font installed.
Only distribute the proprietary Liebherr font/branding where you have permission.

Suggested instruction to the app builder:
Use the included offline index.html, vendor libraries, fonts/fonts.css and assets.
Keep all existing calculations, interactions and report export behavior.
Do not substitute typography or replace report generation with placeholders.
