/**
 * §6.4 left pane — react-pdf viewer with page navigation, zoom and the
 * semi-transparent highlight rectangles from segment.highlights.
 */

import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Download,
  Minus,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Printer,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import '../pdf'; // configures the pdf.js worker
import type { HighlightBox } from '../types';

const ZOOM_MODES = ['Automatischer Zoom', 'Seitenbreite', '100%', '150%'] as const;

export default function PdfViewer({
  pdfUrl,
  page,
  pageCount,
  highlights,
  onPageChange,
}: {
  pdfUrl: string;
  page: number;
  pageCount: number;
  highlights: HighlightBox[];
  onPageChange?: (p: number) => void;
}) {
  const [numPages, setNumPages] = useState(pageCount);
  const [currentPage, setCurrentPage] = useState(page);
  const [zoom, setZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<(typeof ZOOM_MODES)[number]>('Automatischer Zoom');
  const [showThumbs, setShowThumbs] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => setCurrentPage(page), [page, pdfUrl]);

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), numPages || 1);
    setCurrentPage(next);
    onPageChange?.(next);
  };

  const effectiveScale = zoomMode === '150%' ? 1.5 * zoom : zoomMode === '100%' ? zoom : zoom;
  const pageHighlights = highlights.filter((h) => h.page === currentPage);

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* toolbar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-300 bg-gray-200 px-2 py-1 text-gray-700">
        <button className="rounded p-1 hover:bg-gray-300" onClick={() => setShowThumbs((v) => !v)} title="Miniaturansichten">
          <PanelLeft size={15} />
        </button>
        <span className="mx-1 h-4 w-px bg-gray-400" />
        <button className="rounded p-1 hover:bg-gray-300 disabled:opacity-40" disabled={currentPage <= 1} onClick={() => go(1)}>
          <ChevronFirst size={15} />
        </button>
        <button className="rounded p-1 hover:bg-gray-300 disabled:opacity-40" disabled={currentPage <= 1} onClick={() => go(currentPage - 1)}>
          <ChevronLeft size={15} />
        </button>
        <input
          value={currentPage}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v)) go(v);
          }}
          className="w-10 rounded border border-gray-300 px-1 py-0.5 text-center text-xs"
        />
        <span className="text-xs">von {numPages || pageCount}</span>
        <button
          className="rounded p-1 hover:bg-gray-300 disabled:opacity-40"
          disabled={currentPage >= numPages}
          onClick={() => go(currentPage + 1)}
        >
          <ChevronRight size={15} />
        </button>
        <button
          className="rounded p-1 hover:bg-gray-300 disabled:opacity-40"
          disabled={currentPage >= numPages}
          onClick={() => go(numPages)}
        >
          <ChevronLast size={15} />
        </button>
        <span className="mx-1 h-4 w-px bg-gray-400" />
        <button className="rounded p-1 hover:bg-gray-300" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}>
          <Minus size={15} />
        </button>
        <button className="rounded p-1 hover:bg-gray-300" onClick={() => setZoom((z) => Math.min(3, z + 0.15))}>
          <Plus size={15} />
        </button>
        <select
          value={zoomMode}
          onChange={(e) => {
            setZoomMode(e.target.value as any);
            setZoom(1);
          }}
          className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
        >
          {ZOOM_MODES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1">
          <button className="rounded p-1 hover:bg-gray-300" onClick={() => window.print()} title="Drucken">
            <Printer size={15} />
          </button>
          <a className="rounded p-1 hover:bg-gray-300" href={pdfUrl} download title="Herunterladen">
            <Download size={15} />
          </a>
          <button className="rounded p-1 hover:bg-gray-300">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* page area */}
      <div className="flex min-h-0 flex-1">
        {showThumbs && !error && (
          <div className="w-28 shrink-0 overflow-y-auto border-r border-gray-300 bg-gray-200 p-2">
            <Document file={pdfUrl} loading={null} error={null}>
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i}
                  className={`mb-2 cursor-pointer border ${i + 1 === currentPage ? 'border-blue-500' : 'border-gray-300'}`}
                  onClick={() => go(i + 1)}
                >
                  <Page pageNumber={i + 1} width={90} renderTextLayer={false} renderAnnotationLayer={false} />
                </div>
              ))}
            </Document>
          </div>
        )}
        <div className="flex flex-1 justify-center overflow-auto p-4">
          {error ? (
            <div className="mt-16 max-w-xs text-center text-sm text-gray-500">
              PDF konnte nicht geladen werden.
              <br />
              <span className="text-xs">
                Legen Sie die Datei unter <code>public{pdfUrl}</code> ab (siehe README) oder führen Sie{' '}
                <code>npm run generate:fixtures</code> aus.
              </span>
            </div>
          ) : (
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={() => setError(true)}
              loading={<div className="mt-16 text-sm text-gray-400">PDF wird geladen…</div>}
            >
              <div className="relative shadow-lg">
                <Page
                  pageNumber={Math.min(currentPage, numPages || 1)}
                  scale={effectiveScale}
                  width={zoomMode === 'Seitenbreite' ? 700 : 560}
                  renderTextLayer
                  renderAnnotationLayer={false}
                />
                {/* highlight overlay in % of page size */}
                {pageHighlights.map((h, i) => (
                  <div
                    key={i}
                    className="pointer-events-none absolute rounded-sm"
                    style={{
                      left: `${h.x}%`,
                      top: `${h.y}%`,
                      width: `${h.w}%`,
                      height: `${h.h}%`,
                      backgroundColor: 'rgba(59,130,246,.35)',
                    }}
                  />
                ))}
              </div>
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}
