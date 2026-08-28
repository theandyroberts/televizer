import {
  compareItemsToBest,
  inferRankDirection,
  parseNumericValue,
  rankItems,
} from "./rank";
import { normalizedText } from "./rect";
import type { PresentationItem, RankDirection, TableContext } from "./types";

type KnownRankDirection = Exclude<RankDirection, "unknown">;

const CELL_SELECTOR =
  "th,td,[role='gridcell'],[role='columnheader'],[role='rowheader'],[data-televizer-cell]";
const TABLE_SELECTOR = "table,[role='table'],[role='grid'],[data-televizer-grid]";

function asHtml(element: Element | null | undefined): HTMLElement | null {
  return element instanceof HTMLElement ? element : null;
}

function explicitRankDirection(element: HTMLElement): string | null {
  return element.closest<HTMLElement>("[data-televizer-rank]")?.dataset
    .televizerRank ?? null;
}

function nativeTableContext(
  cell: HTMLTableCellElement,
  directionOverride?: KnownRankDirection,
): TableContext | null {
  const table = cell.closest("table");
  const row = cell.closest("tr");
  if (!table || !row) return null;

  const columnIndex = cell.cellIndex;
  const rows = Array.from(table.rows);
  const rowCells = Array.from(row.cells) as HTMLElement[];
  const columnCells = rows
    .map((candidate) => candidate.cells.item(columnIndex))
    .filter((candidate): candidate is HTMLTableCellElement => candidate != null);

  const headerCell = [...columnCells]
    .reverse()
    .find((candidate) => candidate.tagName === "TH" && candidate !== cell);
  const isColumnHeader =
    cell.matches("th[scope='col'],[role='columnheader']") ||
    cell.closest("thead") != null;
  const columnTitle =
    (isColumnHeader ? normalizedText(cell) : normalizedText(headerCell)) ||
    cell.dataset.televizerLabel ||
    `Column ${columnIndex + 1}`;

  const rowLabelCell =
    row.querySelector<HTMLElement>("th[scope='row'],[role='rowheader']") ??
    asHtml(row.cells.item(0));
  const rowTitle =
    normalizedText(rowLabelCell) || row.dataset.televizerLabel || "Current row";

  const rowItems = rowCells
    .map((candidate, index) => {
      const columnHeader = [...rows]
        .slice(0, row.rowIndex + 1)
        .reverse()
        .map((candidateRow) => candidateRow.cells.item(index))
        .find((candidateCell) => candidateCell?.tagName === "TH");
      const item = itemFromCell(
        candidate,
        normalizedText(columnHeader) ||
          candidate.dataset.televizerLabel ||
          `Column ${index + 1}`,
      );
      if (
        candidate !== rowLabelCell &&
        candidate instanceof HTMLTableCellElement
      ) {
        Object.assign(item, compareCellWithinNativeColumn(
          candidate,
          table,
          item.label,
          asHtml(columnHeader),
          directionOverride,
        ));
      }
      return item;
    })
    .filter((item) => item.sourceElement !== rowLabelCell);

  const columnItems = columnCells
    .filter((candidate) => candidate.closest("thead") == null)
    .map((candidate) => {
      const candidateRow = candidate.closest("tr");
      const labelCell =
        candidateRow?.querySelector<HTMLElement>("th[scope='row'],[role='rowheader']") ??
        asHtml(candidateRow?.cells.item(0));
      return itemFromCell(
        candidate,
        normalizedText(labelCell) ||
          candidate.closest<HTMLElement>("[data-televizer-label]")?.dataset
            .televizerLabel ||
          `Row ${(candidateRow?.rowIndex ?? 0) + 1}`,
      );
    });

  const rowRankLabel = rowItems.map((item) => item.label).join(" ");
  return {
    table,
    cell,
    rowElements: rowCells,
    columnElements: columnCells,
    rowTitle,
    columnTitle,
    rowItems,
    columnItems,
    rowRankDirection: resolvedRankDirection(
      rowRankLabel,
      explicitRankDirection(row),
      directionOverride,
    ),
    columnRankDirection: rankDirectionForColumn(
      cell,
      columnTitle,
      table,
      headerCell,
      directionOverride,
    ),
  };
}

function resolvedRankDirection(
  label: string,
  explicit?: string | null,
  directionOverride?: KnownRankDirection,
): KnownRankDirection {
  if (directionOverride) return directionOverride;
  const inferred = inferRankDirection(label, explicit);
  return inferred === "unknown" ? "higher" : inferred;
}

function rankDirectionForColumn(
  cell: HTMLElement,
  label: string,
  table: HTMLElement,
  header?: HTMLElement | null,
  directionOverride?: KnownRankDirection,
): KnownRankDirection {
  if (directionOverride) return directionOverride;
  const localDirection =
    cell.dataset.televizerRank ?? header?.dataset.televizerRank;
  if (localDirection) return resolvedRankDirection(label, localDirection);
  const inferred = inferRankDirection(label);
  return inferred === "unknown"
    ? resolvedRankDirection(label, table.dataset.televizerRank)
    : inferred;
}

function compareCellWithinNativeColumn(
  cell: HTMLTableCellElement,
  table: HTMLTableElement,
  label: string,
  header?: HTMLElement | null,
  directionOverride?: KnownRankDirection,
): Pick<
  PresentationItem,
  | "rank"
  | "comparisonBaseline"
  | "differenceFromBest"
  | "percentDifferenceFromBest"
> {
  const candidates = Array.from(table.rows)
    .map((candidateRow) => candidateRow.cells.item(cell.cellIndex))
    .filter(
      (candidate): candidate is HTMLTableCellElement =>
        candidate != null && candidate.closest("thead") == null,
    )
    .map((candidate, index) =>
      itemFromCell(
        candidate,
        candidate.closest("tr")?.dataset.televizerLabel || `Row ${index + 1}`,
      ),
    );
  const direction = rankDirectionForColumn(
    cell,
    label,
    table,
    header,
    directionOverride,
  );
  const ranked = rankItems(candidates, direction);
  const comparisons = compareItemsToBest(ranked, direction);
  const compared = comparisons.find(
    (candidate) => candidate.sourceElement === cell,
  );
  const best = comparisons.find(
    (candidate) => candidate.differenceFromBest === 0,
  );
  return {
    rank: compared?.rank,
    comparisonBaseline: best?.value,
    differenceFromBest: compared?.differenceFromBest,
    percentDifferenceFromBest: compared?.percentDifferenceFromBest,
  };
}

function itemFromCell(element: HTMLElement, label: string): PresentationItem {
  const value = element.dataset.televizerValue || normalizedText(element);
  return {
    label,
    value,
    numericValue: parseNumericValue(value),
    sourceElement: element,
  };
}

function rankDirectionForHintedColumn(
  label: string,
  cell: HTMLElement,
  grid: HTMLElement,
  directionOverride?: KnownRankDirection,
): KnownRankDirection {
  if (directionOverride) return directionOverride;
  const inferred = inferRankDirection(label, cell.dataset.televizerRank);
  return inferred === "unknown"
    ? resolvedRankDirection(label, grid.dataset.televizerRank)
    : inferred;
}

function hintedGridContext(
  cell: HTMLElement,
  directionOverride?: KnownRankDirection,
): TableContext | null {
  const grid = cell.closest<HTMLElement>(TABLE_SELECTOR);
  if (!grid) return null;
  const row = cell.closest<HTMLElement>("[data-televizer-row],[role='row']");
  const columnKey = cell.dataset.televizerColumn;
  if (!row || !columnKey) return null;

  const rowCells = Array.from(row.querySelectorAll<HTMLElement>(CELL_SELECTOR));
  const columnCells = Array.from(
    grid.querySelectorAll<HTMLElement>(
      `[data-televizer-column="${CSS.escape(columnKey)}"]`,
    ),
  );
  const rowTitle = row.dataset.televizerLabel || "Current row";
  const columnTitle = cell.dataset.televizerLabel || columnKey;

  const rowItems = rowCells.map((candidate, index) => {
    const label = candidate.dataset.televizerLabel || `Item ${index + 1}`;
    const item = itemFromCell(candidate, label);
    const candidateColumn = candidate.dataset.televizerColumn;
    if (!candidateColumn) return item;
    const peers = Array.from(
      grid.querySelectorAll<HTMLElement>(
        `[data-televizer-column="${CSS.escape(candidateColumn)}"]`,
      ),
    ).map((peer, peerIndex) =>
      itemFromCell(peer, `Item ${peerIndex + 1}`),
    );
    const direction = rankDirectionForHintedColumn(
      label,
      candidate,
      grid,
      directionOverride,
    );
    const comparisons = compareItemsToBest(
      rankItems(peers, direction),
      direction,
    );
    const compared = comparisons.find(
      (peer) => peer.sourceElement === candidate,
    );
    const best = comparisons.find((peer) => peer.differenceFromBest === 0);
    item.rank = compared?.rank;
    item.comparisonBaseline = best?.value;
    item.differenceFromBest = compared?.differenceFromBest;
    item.percentDifferenceFromBest = compared?.percentDifferenceFromBest;
    return item;
  });

  return {
    table: grid,
    cell,
    rowElements: rowCells,
    columnElements: columnCells,
    rowTitle,
    columnTitle,
    rowItems,
    columnItems: columnCells.map((candidate, index) =>
      itemFromCell(
        candidate,
        candidate.closest<HTMLElement>("[data-televizer-row]")?.dataset
          .televizerLabel || `Item ${index + 1}`,
      ),
    ),
    rowRankDirection: resolvedRankDirection(
      rowTitle,
      explicitRankDirection(row) ?? explicitRankDirection(grid),
      directionOverride,
    ),
    columnRankDirection: rankDirectionForHintedColumn(
      columnTitle,
      cell,
      grid,
      directionOverride,
    ),
  };
}

export function resolveTableContext(
  target: HTMLElement,
  directionOverride?: KnownRankDirection,
): TableContext | null {
  const cell = target.closest<HTMLElement>(CELL_SELECTOR);
  if (!cell) return null;
  if (cell instanceof HTMLTableCellElement) {
    return nativeTableContext(cell, directionOverride);
  }
  return hintedGridContext(cell, directionOverride);
}

export function inferScopeFromTableTarget(
  target: HTMLElement,
): "element" | "row" | "column" | null {
  const cell = target.closest<HTMLElement>(CELL_SELECTOR);
  if (!cell) return null;
  if (
    cell.matches("th[scope='col'],[role='columnheader']") ||
    cell.closest("thead") != null
  ) {
    return "column";
  }
  if (
    cell.matches("th[scope='row'],[role='rowheader']") ||
    (cell.closest("tbody") != null &&
      cell.parentElement?.querySelector(CELL_SELECTOR) === cell)
  ) {
    return "row";
  }
  return "element";
}

export { CELL_SELECTOR, TABLE_SELECTOR };
